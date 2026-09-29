/**
 * Importa el catálogo de productos.json a Supabase (products + product_variants,
 * categories y hero_slides).
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/import-catalog.mjs
 *
 * También acepta NEXT_PUBLIC_SUPABASE_ANON_KEY si aún no hay service_role.
 * Es idempotente: hace upsert por slug (productos) y por sku (variantes).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "\nFaltan credenciales. Define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY).\n",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const mediaUrl = (ruta) => "/api/media/" + ruta.split("/").map(encodeURIComponent).join("/");
const sortByOrder = (arr) => [...(arr ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const inferCategory = (name) => {
  const n = name.toUpperCase();
  if (n.includes("PANT") || n.includes("CULOTTE") || n.includes("FLARE") || n.includes("PALAZ")) return "Pantalones";
  if (n.includes("VESTIDO")) return "Vestidos";
  if (n.includes("TOP")) return "Tops";
  if (n.includes("FALDA")) return "Faldas";
  if (n.includes("BLAZER")) return "Blazers";
  return "General";
};

const skuFor = (slug) => `${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 28)}-U`;

async function main() {
  const raw = await readFile(path.join(root, "productos.json"), "utf8");
  const data = JSON.parse(raw);
  const productos = data.productos ?? [];

  console.log(`Importando ${productos.length} productos a ${supabaseUrl} ...`);

  let productCount = 0;
  for (const item of productos) {
    const category = inferCategory(item.nombre);
    const images = sortByOrder(item.fotos).map((photo, idx) => ({
      url: mediaUrl(photo.ruta),
      order: photo.orden ?? idx + 1,
      lifestyle: Boolean(photo.lifestyle),
    }));

    const product = {
      name: item.nombre,
      slug: item.slug,
      description: "",
      category,
      price: 0,
      images,
      is_published: true,
    };

    const { data: saved, error: pErr } = await supabase
      .from("products")
      .upsert(product, { onConflict: "slug" })
      .select("id")
      .single();
    if (pErr) throw new Error(`Producto ${item.slug}: ${pErr.message}`);

    const variant = {
      product_id: saved.id,
      sku: skuFor(item.slug),
      size: "Única",
      color: "—",
      stock_online_qty: 0,
      reserved_qty: 0,
      sold_qty: 0,
      threshold: 2,
      is_active: true,
    };

    const { error: vErr } = await supabase
      .from("product_variants")
      .upsert(variant, { onConflict: "sku" });
    if (vErr) throw new Error(`Variante ${variant.sku}: ${vErr.message}`);

    productCount += 1;
  }

  const categories = [...new Set(productos.map((p) => inferCategory(p.nombre)))];
  for (const name of categories) {
    const { error } = await supabase
      .from("categories")
      .upsert({ name, slug: slugify(name), is_active: true, description: "" }, { onConflict: "name" });
    if (error) throw new Error(`Categoría ${name}: ${error.message}`);
  }

  await supabase.from("hero_slides").delete().eq("zone", "main");
  const portada = sortByOrder(data.portada).map((photo, idx) => ({
    type: "banner",
    zone: "main",
    title: "",
    subtitle: "",
    button_text: "",
    link_url: "",
    media_url: mediaUrl(photo.ruta),
    overlay_opacity: 30,
    alignment: "center",
    is_published: true,
    order_index: idx,
  }));
  if (portada.length) {
    const { error } = await supabase.from("hero_slides").insert(portada);
    if (error) throw new Error(`Hero: ${error.message}`);
  }

  console.log(`\n✓ Importación completa:`);
  console.log(`  · ${productCount} productos (plantillas)`);
  console.log(`  · ${productCount} variantes placeholder (talla "Única")`);
  console.log(`  · ${categories.length} categorías: ${categories.join(", ")}`);
  console.log(`  · ${portada.length} slides de portada`);
  console.log(`\nAsigna tallas, colores, precios y stock desde /admin.\n`);
}

main().catch((err) => {
  console.error("\n✗ Error en la importación:", err.message, "\n");
  process.exit(1);
});
