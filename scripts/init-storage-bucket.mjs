import { projectClient, checked } from "./lib/project.mjs";
const options = {
  public: true,
  fileSizeLimit: 10485760,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "video/mp4",
    "video/webm",
  ],
};
if (!process.argv.includes("--apply")) {
  console.log(
    "Vista previa: catalog-media público, 10 MiB, imágenes JPG/PNG/WebP/AVIF y MP4/WebM. La migración ya configura este bucket.",
  );
  process.exit(0);
}
const client = projectClient();
const buckets = await checked(client.storage.listBuckets());
if (buckets.some((b) => b.id === "catalog-media"))
  await checked(client.storage.updateBucket("catalog-media", options));
else await checked(client.storage.createBucket("catalog-media", options));
console.log("Configuración del bucket alineada con las migraciones.");
