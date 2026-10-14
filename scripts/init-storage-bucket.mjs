import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envRaw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const bucketName = "catalog-media";
  console.log(`Verificando/creando bucket '${bucketName}'...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error al listar buckets:", listError);
    return;
  }
  
  const existing = buckets.find((b) => b.id === bucketName);
  if (!existing) {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
    });
    if (error) {
      console.error("Error al crear bucket:", error);
    } else {
      console.log("Bucket creado exitosamente:", data);
    }
  } else {
    console.log("El bucket ya existe:", existing);
  }

  const { data: currentBuckets } = await supabase.storage.listBuckets();
  console.log("Buckets actuales:", currentBuckets);
}

main();
