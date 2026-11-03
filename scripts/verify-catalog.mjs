import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { format, resolveConfig } from "prettier";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const base = path.join(root, ".verification");
await mkdir(base, { recursive: true });
const env = {
  ...process.env,
  PNPM_MANAGE_PACKAGE_MANAGER_VERSIONS: "false",
  NEXT_TELEMETRY_DISABLED: "1",
  TEMP: path.join(base, "tmp"),
  TMP: path.join(base, "tmp"),
};
await mkdir(env.TEMP, { recursive: true });
function run(command, args, log, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    ...options,
  });
  if (log)
    return writeFile(
      path.join(base, log),
      String(result.stdout ?? "") + String(result.stderr ?? ""),
    ).then(() => {
      if (result.status !== 0)
        throw new Error(
          `${log}: falló (${result.status}). Revisa .verification/${log}.`,
        );
      return result.stdout;
    });
  if (result.status !== 0) throw new Error(`Falló ${command}.`);
  return result.stdout;
}
const cli = (args, log) =>
  run(
    "pnpm",
    [
      "exec",
      "supabase",
      ...args.map((arg) =>
        path.isAbsolute(arg)
          ? path.relative(root, arg).replaceAll("\\", "/")
          : arg,
      ),
    ],
    log,
    { shell: process.platform === "win32" },
  );
const node = (args, log) => run(process.execPath, args, log);
async function prepare(folder, id, port) {
  await mkdir(path.join(folder, "supabase"), { recursive: true });
  await cp("supabase/migrations", path.join(folder, "supabase/migrations"), {
    recursive: true,
    force: true,
  });
  await cp("supabase/tests", path.join(folder, "supabase/tests"), {
    recursive: true,
    force: true,
  });
  // These fixed, dedicated project IDs and ports never target an existing linked/cloud DB.
  await writeFile(
    path.join(folder, "supabase/config.toml"),
    `project_id = "${id}"
[api]
port = ${port}
schemas = ["public"]
max_rows = 1000
[db]
port = ${port + 1}
shadow_port = ${port - 1}
major_version = 17
[studio]
enabled = false
[inbucket]
enabled = false
[analytics]
enabled = false
[edge_runtime]
enabled = false
[auth]
site_url = "http://127.0.0.1:3307"
enable_signup = false
[auth.email]
enable_signup = true
`,
  );
}
const excluded =
  "studio,imgproxy,edge-runtime,logflare,vector,supavisor,inbucket";
async function localStatus(folder, log) {
  const raw = await cli(
    ["status", "--workdir", folder, "--output", "json"],
    log,
  );
  const status = JSON.parse(raw);
  assert(status.API_URL.startsWith("http://127.0.0.1:"));
  const filename = path.join(base, log.replace(".log", ".env"));
  await writeFile(
    filename,
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\nSUPABASE_PERSONAL_PROJECT_CONFIRMED=false\nNEXT_PUBLIC_SITE_URL=http://127.0.0.1:3307\n`,
  );
  return {
    status,
    filename,
    client: createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    }),
  };
}
const check = async (request) => {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
};
console.log("1/7 Instalando desde cero el proyecto local de verificación.");
await prepare(base, "vintage-29-catalog-review", 56321);
await cli(["stop", "--workdir", base], "source-stop.log");
await cli(["start", "--workdir", base, "-x", excluded], "start.log");
await cli(["db", "reset", "--local", "--workdir", base], "reset.log");
await cli(["test", "db", "--workdir", base], "db-tests.log");
const source = await localStatus(base, "source.log");

console.log("2/7 Generando y contrastando tipos con PostgreSQL.");
const rawTypes = await cli(
  [
    "gen",
    "types",
    "typescript",
    "--local",
    "--schema",
    "public",
    "--workdir",
    base,
  ],
  "types.log",
);
const types = await format(rawTypes, {
  ...(await resolveConfig("lib/supabase/database.generated.ts")),
  parser: "typescript",
});
if (process.argv.includes("--update-types"))
  await writeFile("lib/supabase/database.generated.ts", types);
else
  assert.equal(
    (await readFile("lib/supabase/database.generated.ts", "utf8")).replaceAll(
      "\r\n",
      "\n",
    ),
    types,
    "Los tipos generados están desactualizados.",
  );

console.log("3/7 Probando seed sin datos comerciales e idempotencia.");
const seed = [
  `--env-file=${source.filename}`,
  "scripts/seed-products.mjs",
  "--apply",
  "--confirm-personal-project",
];
await node(seed, "seed-drafts.log");
await node(seed, "seed-drafts-repeat.log");
let rows = await check(source.client.from("products").select("id,status"));
assert.equal(rows.length, 11);
assert(rows.every((r) => r.status === "draft"));
assert.equal(
  (await check(source.client.from("product_variants").select("id"))).length,
  0,
);
await cli(["db", "reset", "--local", "--workdir", base], "reset-demo.log");
await node([...seed, "--demo"], "seed-demo.log");
await node([...seed, "--demo"], "seed-demo-repeat.log");
rows = await check(source.client.from("products").select("id,slug,status"));
assert.equal(rows.length, 11);
assert(rows.every((r) => r.status === "published"));
assert.equal(
  (await check(source.client.from("product_variants").select("id"))).length,
  33,
);

console.log("4/7 Exportando catálogo y un archivo real de Storage.");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9N0AAAAASUVORK5CYII=",
  "base64",
);
const storagePath = "verification/pixel.png";
await check(
  source.client.storage
    .from("catalog-media")
    .upload(storagePath, png, { contentType: "image/png", upsert: true }),
);
const publicUrl = source.client.storage
  .from("catalog-media")
  .getPublicUrl(storagePath).data.publicUrl;
await check(
  source.client.from("media_assets").insert({
    file_path: storagePath,
    public_url: publicUrl,
    file_name: "pixel.png",
    content_type: "image/png",
    file_size_bytes: png.length,
  }),
);
await check(
  source.client
    .from("home_slides")
    .insert({ media_url: publicUrl, href: "#productos" }),
);
const photo = await check(
  source.client
    .from("product_media")
    .select("id")
    .order("id")
    .limit(1)
    .single(),
);
await check(
  source.client
    .from("product_media")
    .update({ asset_path: publicUrl })
    .eq("id", photo.id),
);
const transfer = path.join(base, "export");
await node(
  [
    `--env-file=${source.filename}`,
    "scripts/transfer-catalog.mjs",
    "export",
    "--directory",
    transfer,
    "--confirm-personal-project",
  ],
  "export.log",
);

console.log("5/7 Restaurando en una segunda base vacía y otro Storage.");
const targetFolder = path.join(base, "target");
await prepare(targetFolder, "vintage-29-catalog-restore", 57321);
await cli(
  ["start", "--workdir", targetFolder, "-x", excluded],
  "target-start.log",
);
await cli(
  ["db", "reset", "--local", "--workdir", targetFolder],
  "target-reset.log",
);
const target = await localStatus(targetFolder, "target.log");
const importer = [
  `--env-file=${target.filename}`,
  "scripts/transfer-catalog.mjs",
  "import",
  "--directory",
  transfer,
  "--confirm-personal-project",
];
await node(importer, "import-preview.log");
await node([...importer, "--apply"], "import.log");
const restored = await check(
  target.client.from("products").select("id,slug,status").order("id"),
);
assert.deepEqual(
  restored,
  [...rows].sort((a, b) => a.id.localeCompare(b.id)),
);
const restoredMedia = await check(
  target.client.from("media_assets").select("public_url,file_path").single(),
);
assert(restoredMedia.public_url.startsWith(target.status.API_URL));
const image = await check(
  target.client.storage.from("catalog-media").download(restoredMedia.file_path),
);
assert(Buffer.from(await image.arrayBuffer()).equals(png));
const anon = createClient(target.status.API_URL, target.status.ANON_KEY, {
  auth: { persistSession: false },
});
assert.equal((await check(anon.from("products").select("id"))).length, 11);
assert.equal(
  (await check(anon.from("public_catalog_variants").select("id"))).length,
  33,
);
assert(
  (
    await anon.auth.signUp({
      email: "verification-public@example.invalid",
      password: "VerificationOnly123!",
    })
  ).error,
  "El registro público debe permanecer deshabilitado.",
);
assert((await anon.from("variant_prices").select("*")).error);
assert((await anon.from("media_assets").select("*")).error);
assert(
  (
    await target.client.rpc("restore_catalog_snapshot", {
      p_snapshot: JSON.parse(
        await readFile(path.join(transfer, "catalog.json"), "utf8"),
      ),
    })
  ).error,
  "No permite sobrescribir un catálogo existente.",
);
await cli(["test", "db", "--workdir", targetFolder], "target-tests.log");

console.log("6/7 TypeScript y pruebas unitarias.");
await node(
  ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"],
  "typecheck.log",
);
await node(["node_modules/vitest/vitest.mjs", "run"], "unit-tests.log");

if (process.argv.includes("--with-app")) {
  console.log(
    "7/7 Build de producción, páginas públicas y acceso administrativo.",
  );
  await node(
    [
      `--env-file=${target.filename}`,
      "node_modules/next/dist/bin/next",
      "build",
    ],
    "build.log",
  );
  await node(
    [
      `--env-file=${target.filename}`,
      "scripts/verify-app.mjs",
      "--confirm-personal-project",
    ],
    "http-tests.log",
  );
} else
  console.log(
    "7/7 HTTP omitido: añade --with-app para incluir build y smoke HTTP.",
  );
console.log(
  "PASS: migración limpia, RLS, seeds repetibles, transferencia de datos/archivos y comprobaciones de aplicación.",
);
