import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(path.join(projectDirectory, "productos.json"), "utf8"));
const imageRoot = path.join(projectDirectory, "public", "imagenes");
const products = Array.isArray(source.productos) ? source.productos : [];
const slugs = products.map((product) => product.slug);
const duplicateSlugs = [...new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index))];
const missingAssets = products.flatMap((product) =>
  (product.fotos ?? [])
    .filter((image) => !existsSync(path.resolve(imageRoot, image.ruta.replace(/^imagenes\//, ""))))
    .map((image) => image.ruta),
);

console.log("Vista previa del seed completo de catálogo");
console.log(`Productos en el JSON: ${products.length}`);
console.log(`Fotos de productos: ${products.reduce((count, product) => count + (product.fotos?.length ?? 0), 0)}`);
console.log(`Variantes que se prepararían: ${products.length * 6}`);
console.log(`Slugs duplicados: ${duplicateSlugs.length ? duplicateSlugs.join(", ") : "ninguno"}`);
console.log(`Archivos faltantes: ${missingAssets.length ? missingAssets.join(", ") : "ninguno"}`);

if (!process.argv.includes("--apply")) {
  console.log("Sin cambios: para aplicar se requieren --apply y --confirm-personal-project.");
  process.exit(duplicateSlugs.length || missingAssets.length ? 1 : 0);
}
if (!process.argv.includes("--confirm-personal-project")) {
  console.error("No se aplicó: confirma que las credenciales corresponden al proyecto personal.");
  process.exit(1);
}
if (duplicateSlugs.length || missingAssets.length) {
  console.error("No se aplicó: corrige los slugs duplicados y archivos faltantes primero.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("No se aplicó: faltan las variables privadas requeridas para el seed.");
  process.exit(1);
}

const parsedUrl = new URL(supabaseUrl);
const isLocalProject = parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname);
if (!isLocalProject && (parsedUrl.protocol !== "https:" || process.env.SUPABASE_PERSONAL_PROJECT_CONFIRMED !== "true")) {
  console.error("No se aplicó: solo se permite el entorno local o un proyecto personal confirmado.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function single(table, query) {
  const { data, error } = await query;
  if (error) throw new Error(`No se pudo preparar ${table}: ${error.message}`);
  return data;
}

async function ensure(table, values, conflict) {
  const { data, error } = await supabase.from(table).upsert(values, { onConflict: conflict }).select();
  if (error) throw new Error(`No se pudo cargar ${table}: ${error.message}`);
  return data;
}

const [brand] = await ensure("brands", [{ name: "Vintage 29", slug: "vintage-29", is_active: true }], "slug");
const categoryNames = ["Pantalones", "Tops", "Vestidos"];
const categories = await ensure(
  "categories",
  categoryNames.map((name, index) => ({ name, slug: name.toLowerCase(), sort_order: index, is_active: true })),
  "slug",
);
const [priceList] = await ensure("price_lists", [{ name: "Tienda online PEN", currency: "PEN", country_code: "PE", sales_channel: "online", customer_group: "retail", is_active: true }], "name");
const [warehouse] = await ensure("warehouses", [{ name: "Almacén principal", code: "MAIN", country_code: "PE", is_active: true }], "code");
const attributes = await ensure(
  "attributes",
  [
    { name: "Composición", code: "composition", data_type: "text", scope: "product" },
    { name: "Cuidados", code: "care", data_type: "text", scope: "product" },
    { name: "Fit", code: "fit", data_type: "text", scope: "product" },
  ],
  "code",
);

const { data: existing, error: existingError } = await supabase.from("products").select("id, slug").in("slug", slugs);
if (existingError) throw new Error(`No se pudieron consultar productos existentes: ${existingError.message}`);
const existingBySlug = new Map((existing ?? []).map((product) => [product.slug, product.id]));
let createdProducts = 0;
let createdVariants = 0;
let createdMedia = 0;

for (const [index, sourceProduct] of products.entries()) {
  if (existingBySlug.has(sourceProduct.slug)) continue;
  const productId = randomUUID();
  const category = categories.find((item) => item.slug === (sourceProduct.nombre.toLowerCase().includes("vestido") ? "vestidos" : sourceProduct.nombre.toLowerCase().includes("top") ? "tops" : "pantalones"));
  const { error: productError } = await supabase.from("products").insert({
    id: productId,
    brand_id: brand.id,
    category_id: category?.id ?? null,
    name: sourceProduct.nombre,
    slug: sourceProduct.slug,
    description: `Prenda de prueba enriquecida para validar la ficha final de ${sourceProduct.nombre}.`,
    short_description: "Una pieza de prueba del catálogo Vintage 29.",
    product_type: category?.name ?? "Prenda",
    gender: "female",
    age_group: "adult",
    fit: "regular",
    material_summary: "Denim de prueba",
    care_instructions: "Lavar con colores similares y secar a la sombra.",
    country_of_origin: "PE",
    status: "published",
    is_featured: index < 4,
  });
  if (productError) throw new Error(`No se pudo crear ${sourceProduct.slug}: ${productError.message}`);
  createdProducts += 1;

  const colorOptionId = randomUUID();
  const sizeOptionId = randomUUID();
  await supabase.from("product_options").insert([
    { id: colorOptionId, product_id: productId, code: "color", name: "Color", position: 0, is_required: true },
    { id: sizeOptionId, product_id: productId, code: "size", name: "Talla", position: 1, is_required: true },
  ]);
  const colors = [
    { id: randomUUID(), option_id: colorOptionId, value: "Azul denim", slug: "azul-denim", position: 0, hex_color: "#2D4D69" },
    { id: randomUUID(), option_id: colorOptionId, value: "Negro", slug: "negro", position: 1, hex_color: "#171717" },
  ];
  const sizes = ["26", "28", "30"].map((value, position) => ({ id: randomUUID(), option_id: sizeOptionId, value, slug: value, position }));
  await supabase.from("option_values").insert([...colors, ...sizes]);

  const mediaRows = (sourceProduct.fotos ?? []).map((image, mediaIndex) => ({
    id: randomUUID(),
    product_id: productId,
    asset_path: `/${image.ruta.replaceAll("\\", "/")}`,
    media_type: "image",
    alt_text: `${sourceProduct.nombre} · imagen ${image.orden}`,
    position: mediaIndex,
    is_primary: mediaIndex === 0,
    is_lifestyle: image.lifestyle === true,
  }));
  const insertedMedia = await ensure("product_media", mediaRows, "product_id,asset_path");
  createdMedia += insertedMedia.length;

  const variants = [];
  const variantOptionRows = [];
  const variantPriceRows = [];
  const inventoryRows = [];
  const variantMediaRows = [];
  for (const [colorIndex, color] of colors.entries()) {
    for (const [sizeIndex, size] of sizes.entries()) {
      const variantId = randomUUID();
      variants.push({
        id: variantId,
        product_id: productId,
        sku: `${sourceProduct.slug.toUpperCase().replaceAll("-", "_")}-${colorIndex ? "NEG" : "AZU"}-${size.value}`,
        variant_name: `${color.value} / Talla ${size.value}`,
        combination_key: [color.id, size.id].sort().join(":"),
        is_active: true,
        position: colorIndex * sizes.length + sizeIndex,
      });
      const amount = 8990 + index * 500 + colorIndex * 300;
      variantOptionRows.push({ variant_id: variantId, option_value_id: color.id }, { variant_id: variantId, option_value_id: size.id });
      variantPriceRows.push({ variant_id: variantId, price_list_id: priceList.id, amount_cents: amount, compare_at_amount_cents: amount + 1500, is_active: true, tax_included: true });
      inventoryRows.push({ variant_id: variantId, warehouse_id: warehouse.id, quantity_on_hand: 3 + sizeIndex + colorIndex, quantity_reserved: 0, reorder_point: 1, incoming_quantity: 0 });
      if (insertedMedia.length) {
        const media = insertedMedia[Math.min(colorIndex, insertedMedia.length - 1)];
        variantMediaRows.push({ variant_id: variantId, media_id: media.id, position: 0 });
      }
      createdVariants += 1;
    }
  }
  for (const [table, rows] of [["product_variants", variants], ["variant_option_values", variantOptionRows], ["variant_prices", variantPriceRows], ["inventory_levels", inventoryRows], ["variant_media", variantMediaRows]]) {
    if (rows.length) {
      const { error } = await supabase.from(table).insert(rows);
      if (error) throw new Error(`No se pudo cargar ${table}: ${error.message}`);
    }
  }

  const attributePayload = [
    { product_id: productId, attribute_id: attributes.find((item) => item.code === "composition").id, value_text: "98% algodón, 2% elastano" },
    { product_id: productId, attribute_id: attributes.find((item) => item.code === "care").id, value_text: "Lavar con colores similares" },
    { product_id: productId, attribute_id: attributes.find((item) => item.code === "fit").id, value_text: "Regular" },
  ];
  await supabase.from("product_attribute_values").insert(attributePayload);
  const chartId = randomUUID();
  await supabase.from("size_charts").insert({ id: chartId, product_id: productId, name: "Medidas de la prenda", category: "Ropa de mujer", size_system: "INT", unit: "cm", measurement_type: "garment" });
  for (const [sizeIndex, size] of sizes.entries()) {
    const rowId = randomUUID();
    await supabase.from("size_chart_rows").insert({ id: rowId, size_chart_id: chartId, option_value_id: size.id, size_label: size.value, sort_order: sizeIndex });
    await supabase.from("size_measurements").insert([
      { size_chart_row_id: rowId, measurement_code: "waist", min_value: 68 + sizeIndex * 4, max_value: 72 + sizeIndex * 4, unit: "cm" },
      { size_chart_row_id: rowId, measurement_code: "hip", min_value: 92 + sizeIndex * 4, max_value: 96 + sizeIndex * 4, unit: "cm" },
      { size_chart_row_id: rowId, measurement_code: "inseam", min_value: 76, max_value: 76, unit: "cm" },
    ]);
  }
}

console.log(`Seed completo aplicado sin reemplazar productos existentes: ${createdProducts} productos, ${createdVariants} variantes y ${createdMedia} imágenes.`);
