import { z } from "zod";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/** Only assets served by this deployment or its configured Supabase project. */
export function isCatalogMediaUrl(
  value: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): boolean {
  if (
    /^\/imagenes\/[A-Za-z0-9 _()./-]+$/.test(value) &&
    !value.split("/").includes("..")
  )
    return true;
  try {
    if (!supabaseUrl) return false;
    const asset = new URL(value);
    const project = new URL(supabaseUrl);
    return (
      asset.origin === project.origin &&
      !asset.username &&
      !asset.password &&
      asset.pathname.startsWith("/storage/v1/object/public/catalog-media/") &&
      !asset.hash &&
      !asset.search
    );
  } catch {
    return false;
  }
}

export function isSafeLink(value: string): boolean {
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
    return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const nullableUuid = z.uuid().nullable();
const stockAdjustment = z
  .object({
    expected_quantity: z.number().int().min(0),
    quantity: z.number().int().min(0).max(1_000_000),
    reason: z
      .string()
      .trim()
      .min(3, "Indica el motivo del ajuste de stock.")
      .max(500),
  })
  .nullable()
  .optional();
export const variantInputSchema = z.object({
  id: z.uuid(),
  color_id: nullableUuid,
  size_id: nullableUuid,
  sku: z.string().trim().max(100),
  variant_name: z.string().trim().max(250),
  is_active: z.boolean(),
  position: z.number().int().min(0),
  prices: z
    .array(
      z.object({
        price_list_id: z.uuid(),
        amount_cents: z.number().int().positive().max(100_000_000),
        is_active: z.literal(true),
        tax_included: z.boolean(),
      }),
    )
    .max(1),
  stock_adjustment: stockAdjustment,
});
export const mediaInputSchema = z.object({
  id: z.uuid(),
  color_id: nullableUuid.optional(),
  asset_path: z
    .string()
    .max(2048)
    .refine(
      (url) => isCatalogMediaUrl(url) && /\.(jpe?g|png|webp|avif)$/i.test(url),
      "Usa una imagen local o del Storage configurado para esta tienda.",
    ),
  alt_text: z.string().max(500),
  position: z.number().int().min(0),
  is_primary: z.boolean(),
  is_lifestyle: z.boolean(),
});

export const homeMediaSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    isCatalogMediaUrl,
    "Usa un archivo local o del Storage configurado para esta tienda.",
  );
export const homeLinkSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeLink, "El enlace debe ser interno o HTTPS.");

export function matchesMediaSignature(
  bytes: Uint8Array,
  mime: string,
): boolean {
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return (
      bytes[0] === 0x89 &&
      text(1, 4) === "PNG" &&
      bytes[4] === 13 &&
      bytes[5] === 10
    );
  if (mime === "image/webp")
    return text(0, 4) === "RIFF" && text(8, 12) === "WEBP";
  if (mime === "image/avif")
    return text(4, 8) === "ftyp" && /avif|avis/.test(text(8, 32));
  if (mime === "video/mp4") return text(4, 8) === "ftyp";
  if (mime === "video/webm")
    return (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  return false;
}
