import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envRaw = readFileSync(".env.local", "utf8");
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan variables en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "catalog-media";
const localRoot = path.join(process.cwd(), "public", "imagenes");

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".avif") return "image/avif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  return "application/octet-stream";
}

async function uploadFile(absolutePath, storagePath) {
  const fileBuffer = readFileSync(absolutePath);
  const mimeType = getMimeType(absolutePath);
  const stats = statSync(absolutePath);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Error subiendo ${storagePath}: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  // Registrar en media_assets
  await supabase.from("media_assets").upsert({
    bucket_id: BUCKET,
    file_path: storagePath,
    public_url: publicUrl,
    file_name: path.basename(absolutePath),
    content_type: mimeType,
    file_size_bytes: stats.size,
  }, { onConflict: "file_path" });

  return publicUrl;
}

async function main() {
  console.log("Iniciando migración de imágenes locales a Supabase Storage...");
  if (!existsSync(localRoot)) {
    console.error("No existe el directorio public/imagenes");
    return;
  }

  const entries = readdirSync(localRoot, { withFileTypes: true });
  const urlMapping = new Map(); // localAssetPath (/imagenes/...) -> publicUrl

  for (const entry of entries) {
    const entryPath = path.join(localRoot, entry.name);

    if (entry.isFile()) {
      // Portadas y archivos raíz
      const safeName = slugify(path.parse(entry.name).name) + path.extname(entry.name).toLowerCase();
      const storagePath = `home/${safeName}`;
      console.log(`Subiendo archivo de inicio: ${entry.name} -> ${storagePath}`);
      const publicUrl = await uploadFile(entryPath, storagePath);
      urlMapping.set(`/imagenes/${entry.name}`, publicUrl);
    } else if (entry.isDirectory()) {
      // Carpeta de producto
      const productSlug = slugify(entry.name);
      const productFiles = readdirSync(entryPath, { withFileTypes: true });

      for (const file of productFiles) {
        if (!file.isFile()) continue;
        const filePath = path.join(entryPath, file.name);
        const safeFileName = file.name.replace(/\s+/g, "_").toLowerCase();
        const storagePath = `products/${productSlug}/${safeFileName}`;

        console.log(`Subiendo: ${entry.name}/${file.name} -> ${storagePath}`);
        const publicUrl = await uploadFile(filePath, storagePath);

        const localPath = `/imagenes/${entry.name}/${file.name}`;
        urlMapping.set(localPath, publicUrl);
      }
    }
  }

  console.log(`\nArchivos subidos exitosamente a Storage: ${urlMapping.size}`);

  // Actualizar product_media en la base de datos
  console.log("\nActualizando rutas en la tabla product_media...");
  let updatedCount = 0;
  for (const [localPath, publicUrl] of urlMapping.entries()) {
    const { data, error } = await supabase
      .from("product_media")
      .update({ asset_path: publicUrl })
      .eq("asset_path", localPath)
      .select("id");

    if (error) {
      console.error(`Error actualizando ${localPath}:`, error.message);
    } else if (data && data.length > 0) {
      updatedCount += data.length;
    }
  }
  console.log(`Filas actualizadas en product_media: ${updatedCount}`);

  // Poblar home_slides si está vacío
  const { data: existingSlides } = await supabase.from("home_slides").select("id");
  if (!existingSlides || existingSlides.length === 0) {
    console.log("\nPoblando slides iniciales en home_slides...");
    const portada1 = urlMapping.get("/imagenes/PORTADA 1.jpg");
    const portada2 = urlMapping.get("/imagenes/PORTADA 2.jpg");
    const portada3 = urlMapping.get("/imagenes/PORTADA 3.jpg");

    const initialSlides = [
      portada1 && { title: "Nueva Temporada", subtitle: "Vintage 29", media_type: "image", media_url: portada1, button_label: "Ver Colección", href: "#productos", sort_order: 1, is_active: true },
      portada2 && { title: "Esenciales Denim", subtitle: "Confección y diseño", media_type: "image", media_url: portada2, button_label: "Descubrir", href: "#productos", sort_order: 2, is_active: true },
      portada3 && { title: "Estilo Urbano", subtitle: "Cortes y fits exclusivos", media_type: "image", media_url: portada3, button_label: "Comprar ahora", href: "#productos", sort_order: 3, is_active: true },
    ].filter(Boolean);

    if (initialSlides.length > 0) {
      await supabase.from("home_slides").insert(initialSlides);
      console.log(`Se insertaron ${initialSlides.length} slides iniciales en home_slides.`);
    }
  }

  // Poblar banner inicial si no existe
  const { data: existingBanners } = await supabase.from("home_banners").select("id").eq("identifier", "main_promo");
  if (!existingBanners || existingBanners.length === 0) {
    console.log("Configurando banner principal en home_banners...");
    const bannerImg = urlMapping.get("/imagenes/PORTADA 2.jpg") || urlMapping.get("/imagenes/PORTADA 1.jpg");
    if (bannerImg) {
      await supabase.from("home_banners").insert({
        identifier: "main_promo",
        title: "Blouses Collection",
        subtitle: "Descubre nuestra selección especial de temporada",
        button_label: "Comprar ahora",
        href: "#productos",
        image_url: bannerImg,
        is_active: true,
      });
      console.log("Banner principal insertado con éxito.");
    }
  }

  console.log("\n¡Migración completada con éxito!");
}

main().catch((err) => {
  console.error("Error en migración:", err);
  process.exit(1);
});
