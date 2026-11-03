import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { projectClient, checked } from "./lib/project.mjs";
const root = path.join(process.cwd(), "public", "imagenes");
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(jpe?g|png|webp|avif)$/i.test(file)) files.push(file);
  }
}
await walk(root);
console.log(
  `Imágenes locales: ${files.length}. Solo se reemplazarán referencias existentes; no se crean campañas.`,
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Vista previa. Para escribir: --apply --confirm-personal-project",
  );
  process.exit(0);
}
const client = projectClient();
for (const file of files) {
  const relative = path
    .relative(path.join(process.cwd(), "public"), file)
    .replaceAll("\\", "/");
  const extension = path.extname(file).slice(1).toLowerCase();
  const mime = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  }[extension];
  if ((await stat(file)).size > 10485760)
    throw new Error(`Archivo supera 10 MiB: ${relative}`);
  const key = `local/${createHash("sha256").update(relative).digest("hex").slice(0, 24)}.${extension}`;
  const existing = await checked(
    client
      .from("media_assets")
      .select("public_url")
      .eq("file_path", key)
      .maybeSingle(),
  );
  let url = existing?.public_url;
  if (!url) {
    const bytes = await readFile(file);
    await checked(
      client.storage
        .from("catalog-media")
        .upload(key, bytes, { contentType: mime, upsert: false }),
    );
    url = client.storage.from("catalog-media").getPublicUrl(key).data.publicUrl;
    try {
      await checked(
        client
          .from("media_assets")
          .insert({
            file_path: key,
            public_url: url,
            file_name: path.basename(file),
            content_type: mime,
            file_size_bytes: bytes.length,
          }),
      );
    } catch (error) {
      await client.storage.from("catalog-media").remove([key]);
      throw error;
    }
  }
  for (const [table, column] of [
    ["product_media", "asset_path"],
    ["home_slides", "media_url"],
    ["home_banners", "image_url"],
  ]) {
    await checked(
      client
        .from(table)
        .update({ [column]: url })
        .eq(column, `/${relative}`),
    );
  }
}
console.log(
  "Imágenes registradas y referencias actualizadas. Repetir conserva los registros existentes.",
);
