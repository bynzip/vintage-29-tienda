import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { projectClient, checked } from "./lib/project.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(
  readFileSync(path.join(root, "productos.json"), "utf8"),
);
const products = source.productos;
const slugs = products.map((p) => p.slug);
const missing = products
  .flatMap((p) => p.fotos)
  .filter((f) => !existsSync(path.join(root, "public", f.ruta)));
if (new Set(slugs).size !== slugs.length || missing.length)
  throw new Error("Slugs duplicados o fotos faltantes.");
const demo = process.argv.includes("--demo");
console.log(
  JSON.stringify({
    products: products.length,
    photos: products.reduce((n, p) => n + p.fotos.length, 0),
    missingFiles: missing.length,
    mode: demo
      ? "DEMO: variantes, precios y stock ficticios"
      : "Borradores sin datos comerciales inventados",
  }),
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Vista previa. Para escribir: --apply --confirm-personal-project. --demo es opcional y solo para pruebas.",
  );
  process.exit(0);
}
const supabase = projectClient();
const config = await checked(
  supabase.from("catalog_settings").select("price_list_id").single(),
);
let color,
  sizes = [],
  subcategory;
if (demo) {
  const ensure = async (table, record) =>
    checked(
      supabase
        .from(table)
        .upsert(record, { onConflict: "slug" })
        .select()
        .single(),
    );
  const parent = await ensure("categories", {
    name: "Demostración",
    slug: "demo",
    is_active: true,
  });
  subcategory = await ensure("categories", {
    name: "Prendas de demostración",
    slug: "demo-prendas",
    parent_id: parent.id,
    is_active: true,
  });
  color = await ensure("colors", {
    name: "Azul de demostración",
    slug: "demo-azul",
    hex_color: "#245A85",
    is_active: true,
  });
  for (const name of ["S", "M", "L"])
    sizes.push(
      await ensure("sizes", {
        name: `${name} demo`,
        slug: `demo-${name.toLowerCase()}`,
        is_active: true,
      }),
    );
}
let created = 0;
for (const [index, product] of products.entries()) {
  const existing = await checked(
    supabase
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .maybeSingle(),
  );
  if (existing) continue;
  const payload = {
    id: randomUUID(),
    expected_updated_at: null,
    name: product.nombre,
    slug: product.slug,
    description: demo
      ? "Producto de demostración: precios y existencias ficticios."
      : null,
    status: demo ? "published" : "draft",
    subcategory_id: subcategory?.id ?? null,
    is_featured: false,
    color_ids: color ? [color.id] : [],
    size_ids: sizes.map((s) => s.id),
    variants: sizes.map((size, position) => ({
      id: randomUUID(),
      color_id: color.id,
      size_id: size.id,
      variant_name: `${color.name} / ${size.name}`,
      sku: `DEMO-${index + 1}-${position + 1}`,
      is_active: true,
      position,
      prices: [
        {
          price_list_id: config.price_list_id,
          amount_cents: 10000 + index * 100,
          is_active: true,
          tax_included: true,
        },
      ],
      stock_adjustment: {
        expected_quantity: 0,
        quantity: 3,
        reason: "Carga inicial de demostración",
      },
    })),
    media: product.fotos.map((f, position) => ({
      id: randomUUID(),
      asset_path: `/${f.ruta.replaceAll("\\", "/")}`,
      color_id: null,
      alt_text: product.nombre,
      position,
      is_primary: position === 0,
      is_lifestyle: Boolean(f.lifestyle),
    })),
  };
  await checked(supabase.rpc("save_catalog_product", { p_payload: payload }));
  created++;
}
console.log(
  `Creados ${created}; existentes conservados ${products.length - created}.`,
);
