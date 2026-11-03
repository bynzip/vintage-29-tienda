import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { projectClient, checked } from "./lib/project.mjs";

const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
assert(
  projectUrl.hostname === "127.0.0.1" &&
    ["56321", "57321"].includes(projectUrl.port),
  "Este smoke test solo admite los proyectos locales de verificación.",
);
const client = projectClient();
const products = await checked(
  client.from("products").select("id,slug").eq("status", "published"),
);
assert(products.length > 0);
const log = await open(".verification/server.log", "w");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3307",
  ],
  {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", log.fd, log.fd],
    windowsHide: true,
  },
);
let userId;
try {
  const baseUrl = "http://127.0.0.1:3307";
  const request = (url, options = {}) =>
    fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await request(baseUrl)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(ready, "Servidor no disponible.");
  const home = await request(baseUrl);
  assert.equal(home.status, 200);
  assert((await home.text()).includes(products[0].slug));
  for (const product of products)
    assert.equal(
      (await request(`${baseUrl}/products/${product.slug}`)).status,
      200,
    );
  assert.equal(
    (await request(`${baseUrl}/products/does-not-exist`)).status,
    404,
    "Producto inexistente debe devolver HTTP 404.",
  );
  for (const page of [
    "/admin/products",
    "/admin/products/new",
    "/admin/home",
    "/admin/media",
  ]) {
    const response = await request(baseUrl + page, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert(response.headers.get("location")?.includes("/admin/login"));
  }
  const media = await checked(
    client.from("media_assets").select("public_url").limit(1).single(),
  );
  assert.equal(
    (await request(media.public_url)).status,
    200,
    "Archivo público disponible en el nuevo proyecto.",
  );
  const optimized = `${baseUrl}/_next/image?${new URLSearchParams({ url: media.public_url, w: "256", q: "75" })}`;
  assert.equal(
    (await request(optimized)).status,
    200,
    "Next debe poder optimizar la imagen del nuevo proyecto.",
  );
  const password = randomUUID() + "aA9!";
  const { user } = await checked(
    client.auth.admin.createUser({
      email: `verification-${randomUUID()}@example.invalid`,
      password,
      email_confirm: true,
    }),
  );
  userId = user.id;
  await checked(client.from("admin_profiles").insert({ user_id: user.id }));
  const cookies = new Map();
  const session = createServerClient(
    projectUrl.origin,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value }) => cookies.set(name, value)),
      },
    },
  );
  await checked(
    session.auth.signInWithPassword({ email: user.email, password }),
  );
  const headers = {
    cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  };
  for (const page of [
    "/admin/products",
    "/admin/products/new",
    `/admin/products/${products[0].id}/edit`,
    "/admin/home",
    "/admin/media",
  ])
    assert.equal(
      (await request(baseUrl + page, { headers, redirect: "manual" })).status,
      200,
      `Admin: ${page}`,
    );
  await checked(
    client
      .from("admin_profiles")
      .update({ is_active: false })
      .eq("user_id", user.id),
  );
  assert.equal(
    (
      await request(baseUrl + "/admin/products", {
        headers,
        redirect: "manual",
      })
    ).status,
    307,
  );
  console.log(
    JSON.stringify({
      publicProductPages: products.length,
      missingProduct: 404,
      adminPages: 5,
      revocation: "blocked",
      imageOptimization: "ok",
    }),
  );
} finally {
  if (userId) await client.auth.admin.deleteUser(userId);
  server.kill();
  await log.close();
}
