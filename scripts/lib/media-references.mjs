export function isProjectMediaUrl(value, origin) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.origin === origin &&
      parsed.pathname.startsWith("/storage/v1/object/public/catalog-media/")
    );
  } catch {
    return false;
  }
}

export function replaceMediaReferences(tables, replacement) {
  for (const [table, column] of [
    ["categories", "image_path"],
    ["product_media", "asset_path"],
    ["home_slides", "media_url"],
    ["home_slides", "href"],
    ["home_banners", "image_url"],
    ["home_banners", "href"],
  ]) {
    for (const row of tables[table] ?? [])
      row[column] = replacement.get(row[column]) ?? row[column];
  }
}
