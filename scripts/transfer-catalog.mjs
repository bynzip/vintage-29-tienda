import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { projectClient, checked } from "./lib/project.mjs";
import { isProjectMediaUrl, replaceMediaReferences } from "./lib/media-references.mjs";

// Whitelist shared with the lean schema. Unknown/legacy columns never enter a snapshot.
const fields = {
  categories:
    "id,parent_id,name,slug,description,image_path,sort_order,is_active,created_at,updated_at",
  colors: "id,name,slug,hex_color,sort_order,is_active,created_at,updated_at",
  sizes: "id,name,slug,sort_order,is_active,created_at,updated_at",
  fits: "id,name,slug,sort_order,is_active,created_at,updated_at",
  products:
    "id,subcategory_id,fit_id,name,slug,description,short_description,gender,material_summary,care_instructions,status,is_featured,deleted_at,created_at,updated_at",
  product_colors: "product_id,color_id,position",
  product_sizes: "product_id,size_id,position",
  product_variants:
    "id,product_id,color_id,size_id,sku,variant_name,combination_key,is_active,position,created_at,updated_at",
  product_media:
    "id,product_id,color_id,asset_path,media_type,alt_text,position,is_primary,is_lifestyle,created_at,updated_at",
  price_lists:
    "id,name,currency,country_code,sales_channel,customer_group,starts_at,ends_at,is_active,created_at,updated_at",
  warehouses:
    "id,name,code,address,country_code,is_active,created_at,updated_at",
  variant_prices:
    "id,variant_id,price_list_id,amount_cents,compare_at_amount_cents,tax_included,starts_at,ends_at,is_active,created_at,updated_at",
  inventory_levels:
    "variant_id,warehouse_id,quantity_on_hand,quantity_reserved,reorder_point,incoming_quantity,updated_at",
  inventory_movements:
    "id,variant_id,warehouse_id,movement_type,quantity,reference_type,reference_id,notes,created_by,created_at",
  media_assets:
    "id,bucket_id,file_path,public_url,file_name,content_type,file_size_bytes,created_at,deleting_at",
  home_slides:
    "id,title,subtitle,media_type,media_url,button_label,href,sort_order,is_active,created_at,updated_at",
  home_banners:
    "id,identifier,title,subtitle,button_label,href,image_url,is_active,created_at,updated_at",
};
const mode = process.argv[2];
const value = (flag) => {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
};
const directory = path.resolve(
  value("--directory") ?? "catalog-backups/catalog",
);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function filePath(relative) {
  if (
    !relative ||
    relative.includes("\\") ||
    relative
      .split("/")
      .some((part) => !part || part === "." || part === "..") ||
    path.isAbsolute(relative)
  )
    throw new Error("Ruta de archivo insegura.");
  const resolved = path.resolve(directory, "files", relative);
  if (path.relative(path.join(directory, "files"), resolved).startsWith(".."))
    throw new Error("Ruta fuera de la exportación.");
  return resolved;
}
const supabase = projectClient();
async function readTable(table) {
  const rows = [];
  const order =
    table === "inventory_levels"
      ? "variant_id"
      : table === "product_colors" || table === "product_sizes"
        ? "product_id"
        : "id";
  for (let from = 0; ; from += 200) {
    let query = supabase.from(table).select("*").order(order);
    if (table === "product_colors") query = query.order("color_id");
    if (table === "product_sizes") query = query.order("size_id");
    if (table === "inventory_levels") query = query.order("warehouse_id");
    const page = await checked(query.range(from, from + 199));
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}
const cut = (table, row) =>
  Object.fromEntries(
    fields[table].split(",").map((key) => [key, row[key] ?? null]),
  );

if (mode === "export") {
  const tables = {};
  for (const table of Object.keys(fields))
    tables[table] = (await readTable(table)).map((row) => cut(table, row));
  // Compatible with the previous project, which did not have catalog_settings.
  const configResult = await supabase
    .from("catalog_settings")
    .select("price_list_id,warehouse_id")
    .maybeSingle();
  const choose = (rows, explicit, label) => {
    const candidates = rows.filter((r) => r.is_active);
    const id = explicit ?? (candidates.length === 1 ? candidates[0].id : null);
    if (!id || !rows.some((r) => r.id === id))
      throw new Error(
        `Selecciona ${label} explícitamente; hay varias opciones.`,
      );
    return id;
  };
  const priceListId = choose(
    tables.price_lists,
    value("--price-list") ?? configResult.data?.price_list_id,
    "--price-list",
  );
  const warehouseId = choose(
    tables.warehouses,
    value("--warehouse") ?? configResult.data?.warehouse_id,
    "--warehouse",
  );
  tables.price_lists = tables.price_lists.filter((r) => r.id === priceListId);
  tables.warehouses = tables.warehouses.filter((r) => r.id === warehouseId);
  tables.variant_prices = tables.variant_prices.filter(
    (r) => r.price_list_id === priceListId,
  );
  tables.inventory_levels = tables.inventory_levels.filter(
    (r) => r.warehouse_id === warehouseId,
  );
  if (tables.inventory_levels.some((r) => r.quantity_reserved))
    throw new Error(
      "Existen reservas. Deben conciliarse antes de migrar un catálogo sin pedidos.",
    );
  tables.inventory_movements = tables.inventory_movements
    .filter((r) => r.warehouse_id === warehouseId)
    .map((r) => ({ ...r, created_by: null }));
  if (tables.media_assets.some((r) => r.deleting_at))
    throw new Error(
      "Hay eliminaciones de medios pendientes. Resuélvelas antes de exportar.",
    );
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
  const references = [
    ...tables.categories.map((r) => r.image_path),
    ...tables.product_media.map((r) => r.asset_path),
    ...tables.home_slides.map((r) => r.media_url),
    ...tables.home_banners.map((r) => r.image_url),
    // Campaign links may point directly to a public file, not only a page.
    ...[...tables.home_slides, ...tables.home_banners]
      .map((r) => r.href)
      .filter((url) => isProjectMediaUrl(url, origin)),
  ];
  for (const url of references.filter((r) => r && /^https?:/.test(r))) {
    const parsed = new URL(url);
    const prefix = "/storage/v1/object/public/catalog-media/";
    if (parsed.origin !== origin || !parsed.pathname.startsWith(prefix))
      throw new Error(
        "Hay archivos de otro proveedor/proyecto. Incorpóralos al Storage propio antes de migrar.",
      );
    if (!tables.media_assets.some((r) => r.public_url === url)) {
      const relative = decodeURIComponent(parsed.pathname.slice(prefix.length));
      tables.media_assets.push({
        id: randomUUID(),
        bucket_id: "catalog-media",
        file_path: relative,
        public_url: url,
        file_name: path.basename(relative),
        content_type: null,
        file_size_bytes: null,
        created_at: new Date().toISOString(),
        deleting_at: null,
      });
    }
  }
  await mkdir(directory, { recursive: true });
  const files = [];
  for (const asset of tables.media_assets) {
    const blob = await checked(
      supabase.storage.from("catalog-media").download(asset.file_path),
    );
    const bytes = Buffer.from(await blob.arrayBuffer());
    const destination = filePath(asset.file_path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    asset.content_type = asset.content_type || blob.type;
    asset.file_size_bytes = bytes.length;
    files.push({ path: asset.file_path, sha256: digest(bytes) });
  }
  const snapshot = {
    format: "vintage29-catalog-v1",
    source_origin: origin,
    exported_at: new Date().toISOString(),
    price_list_id: priceListId,
    warehouse_id: warehouseId,
    tables,
    files,
  };
  await writeFile(
    path.join(directory, "catalog.json"),
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      mode,
      products: tables.products.length,
      files: files.length,
      directory,
    }),
  );
} else if (mode === "import") {
  const snapshot = JSON.parse(
    await readFile(path.join(directory, "catalog.json"), "utf8"),
  );
  if (
    snapshot.format !== "vintage29-catalog-v1" ||
    !snapshot.tables ||
    !Array.isArray(snapshot.files)
  )
    throw new Error("Formato de exportación inválido.");
  if (snapshot.source_origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin)
    throw new Error("El destino coincide con el proyecto de origen de la exportación.");
  for (const table of Object.keys(fields))
    if (!Array.isArray(snapshot.tables[table]))
      throw new Error(`Falta ${table}.`);
  for (const file of snapshot.files) {
    const bytes = await readFile(filePath(file.path));
    if (digest(bytes) !== file.sha256)
      throw new Error(`El archivo ${file.path} no coincide con su checksum.`);
  }
  const manifest = new Set(snapshot.files.map((file) => file.path));
  if (manifest.size !== snapshot.files.length ||
      snapshot.tables.media_assets.some((asset) => !manifest.has(asset.file_path)))
    throw new Error("El manifiesto no cubre todos los archivos de la biblioteca o contiene rutas duplicadas.");
  if (!process.argv.includes("--apply")) {
    console.log(
      JSON.stringify({
        mode: "preview",
        products: snapshot.tables.products.length,
        files: snapshot.files.length,
      }),
    );
    process.exit(0);
  }
  for (const table of [
    "products",
    "home_slides",
    "home_banners",
    "media_assets",
  ]) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { head: true, count: "exact" });
    if (error || count)
      throw new Error(
        "El catálogo destino debe estar vacío y tener las migraciones actuales.",
      );
  }
  const replacement = new Map();
  for (const asset of snapshot.tables.media_assets) {
    if (asset.bucket_id !== "catalog-media")
      throw new Error("Bucket no admitido.");
    const bytes = await readFile(filePath(asset.file_path));
    const { error } = await supabase.storage
      .from("catalog-media")
      .upload(asset.file_path, bytes, {
        contentType: asset.content_type,
        upsert: false,
      });
    if (error) {
      const existing = await checked(
        supabase.storage.from("catalog-media").download(asset.file_path),
      );
      if (digest(Buffer.from(await existing.arrayBuffer())) !== digest(bytes))
        throw new Error(
          "El destino contiene un archivo diferente. No se sobrescribió.",
        );
    }
    const { data } = supabase.storage
      .from("catalog-media")
      .getPublicUrl(asset.file_path);
    replacement.set(asset.public_url, data.publicUrl);
    asset.public_url = data.publicUrl;
    asset.deleting_at = null;
  }
  replaceMediaReferences(snapshot.tables, replacement);
  await checked(
    supabase.rpc("restore_catalog_snapshot", { p_snapshot: snapshot }),
  );
  console.log(
    JSON.stringify({
      mode: "imported",
      products: snapshot.tables.products.length,
      files: snapshot.files.length,
    }),
  );
} else
  throw new Error(
    "Uso: transfer-catalog.mjs export|import --directory <carpeta> --confirm-personal-project [--apply]",
  );
