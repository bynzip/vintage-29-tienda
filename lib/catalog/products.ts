import "server-only";

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createSupabasePublicClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { ProductRow, ProductMediaRow } from "@/lib/supabase/database.types";
import type { CatalogProduct, CatalogResult } from "@/lib/catalog/types";

export type { CatalogProduct, CatalogResult } from "@/lib/catalog/types";

type CatalogSourceRow = ProductRow & {
  legacy_category?: { name: string } | null;
  subcategory?: { name: string } | null;
  fit?: { name: string } | null;
  product_colors?: Array<{
    color_id?: string;
    position: number;
    color: { name: string; hex_color: string | null } | null;
  }>;
  product_sizes?: Array<{
    position: number;
    size: { name: string } | null;
  }>;
  product_media?: ProductMediaRow[];
  product_variants?: Array<{
    id: string;
    sku: string | null;
    variant_name: string | null;
    is_active: boolean;
    variant_option_values?: Array<{ option_value_id: string }>;
    variant_prices?: Array<{ amount_cents: number; is_active: boolean }>;
  }>;
};

type VariantAvailabilityRow = { variant_id: string; is_available: boolean };

const cachedAvailableAssets = cache(() => new Set(getImageAssetPaths()));

function mapProduct(
  product: CatalogSourceRow,
  availability: Map<string, boolean>,
  compact = false,
): CatalogProduct {
  const availableAssets = cachedAvailableAssets();
  const colorMap = new Map<string, string>();
  for (const pc of product.product_colors ?? []) {
    if (pc.color && pc.color_id) {
      colorMap.set(pc.color_id, pc.color.name);
    }
  }

  const media = (product.product_media ?? [])
    .filter((item) => item.media_type === "image")
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const isRemote = item.asset_path.startsWith("http://") || item.asset_path.startsWith("https://");
      const url = isRemote ? item.asset_path : (availableAssets.has(item.asset_path) ? item.asset_path : "");
      return {
        url,
        order: item.position,
        lifestyle: item.is_lifestyle,
        alt: item.alt_text,
        colorId: item.color_id ?? null,
        colorName: item.color_id ? (colorMap.get(item.color_id) ?? null) : null,
      };
    });
  const availableMedia = media.filter((item) => item.url);
  const images = compact
    ? availableMedia.filter((item, index) => index < 2 || item.lifestyle)
    : media;
  const variants = (product.product_variants ?? [])
    .filter((variant) => variant.is_active)
    .map((variant) => {
      const price = variant.variant_prices?.find((item) => item.is_active);
      const available = availability.get(variant.id) ?? false;
      return {
        id: variant.id,
        sku: variant.sku,
        name: variant.variant_name,
        price: price ? price.amount_cents / 100 : null,
        available,
      };
    });
  const pricedVariant = variants.find((variant) => variant.price !== null);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description?.trim() || null,
    shortDescription: product.short_description?.trim() || null,
    category: product.subcategory?.name ?? product.legacy_category?.name ?? null,
    gender: product.gender,
    fit: product.fit?.name ?? null,
    material: product.material_summary?.trim() || null,
    careInstructions: product.care_instructions?.trim() || null,
    countryOfOrigin: product.country_of_origin?.trim() || null,
    colors: (product.product_colors ?? [])
      .sort((a, b) => a.position - b.position)
      .flatMap((item) => item.color ? [{ name: item.color.name, hexColor: item.color.hex_color }] : []),
    sizes: (product.product_sizes ?? [])
      .sort((a, b) => a.position - b.position)
      .flatMap((item) => item.size ? [item.size.name] : []),
    price: pricedVariant?.price ?? null,
    available: variants.some((variant) => variant.available),
    cover: images.find((image) => image.url)?.url ?? null,
    images,
    variants,
  };
}

const productSelect = `
  id, brand_id, category_id, subcategory_id, name, slug, description, short_description,
  gender, age_group, fit_id, material_summary, care_instructions,
  country_of_origin, status, is_featured, seo_title, seo_description,
  deleted_at, created_at, updated_at,
  legacy_category:categories!products_category_id_fkey(name),
  product_media(id, product_id, color_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle, created_at, updated_at),
  product_colors(color_id, position, color:colors!product_colors_color_id_fkey(name, hex_color)),
  subcategory:categories!products_subcategory_id_fkey(name),
  product_variants(id, sku, variant_name, is_active, variant_prices(amount_cents, is_active))
`;

const productDetailSelect = `${productSelect},
  fit:fits!products_fit_id_fkey(name),
  product_sizes(position, size:sizes!product_sizes_size_id_fkey(name))
`;

async function readVariantAvailability(
  supabase: any,
  products: CatalogSourceRow[],
): Promise<{ availability: Map<string, boolean>; error: unknown | null }> {
  const variantIds = products.flatMap((product) =>
    (product.product_variants ?? []).filter((variant) => variant.is_active).map((variant) => variant.id),
  );
  if (!variantIds.length) return { availability: new Map(), error: null };

  const { data, error } = await supabase
    .from("public_variant_availability")
    .select("variant_id, is_available")
    .in("variant_id", variantIds);
  if (error) return { availability: new Map(), error };

  return {
    availability: new Map(
      ((data ?? []) as VariantAvailabilityRow[]).map((row) => [row.variant_id, row.is_available]),
    ),
    error: null,
  };
}

async function readPublishedProducts(): Promise<CatalogResult> {
  if (!hasSupabaseConfig()) return { status: "not-configured", products: [] };
  const supabase = createSupabasePublicClient() as any;
  if (!supabase) return { status: "not-configured", products: [] };
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return { status: "error", products: [] };
  const products = data as CatalogSourceRow[];
  const { availability, error: availabilityError } = await readVariantAvailability(supabase, products);
  if (availabilityError) return { status: "error", products: [] };
  return { status: "ready", products: products.map((product) => mapProduct(product, availability, true)) };
}

export const getPublishedProducts = unstable_cache(
  readPublishedProducts,
  ["published-products"],
  { revalidate: 60, tags: ["catalog"] },
);

async function readPublishedProductBySlug(slug: string) {
  if (!hasSupabaseConfig()) return { status: "not-configured" as const, product: null };
  const supabase = createSupabasePublicClient() as any;
  if (!supabase) return { status: "not-configured" as const, product: null };
  const { data, error } = await supabase
    .from("products")
    .select(productDetailSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { status: "error" as const, product: null };
  if (!data) return { status: "not-found" as const, product: null };
  const product = data as CatalogSourceRow;
  const { availability, error: availabilityError } = await readVariantAvailability(supabase, [product]);
  if (availabilityError) return { status: "error" as const, product: null };
  return { status: "ready" as const, product: mapProduct(product, availability) };
}

export const getPublishedProductBySlug = cache(async (slug: string) =>
  unstable_cache(
    () => readPublishedProductBySlug(slug),
    ["published-product", slug],
    { revalidate: 60, tags: ["catalog", `product:${slug}`] },
  )(),
);

const cachedImageAssetPaths = cache(() => getImageAssetPathsUncached());

export function getImageAssetPaths(directory = path.join(process.cwd(), "public", "imagenes")) {
  if (directory === path.join(process.cwd(), "public", "imagenes")) return cachedImageAssetPaths();
  return getImageAssetPathsUncached(directory);
}

function getImageAssetPathsUncached(directory = path.join(process.cwd(), "public", "imagenes")) {
  const paths: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(?:jpe?g|png|webp|avif)$/i.test(entry.name)) {
        paths.push(`/${path.relative(path.join(process.cwd(), "public"), absolute).replaceAll("\\", "/")}`);
      }
    }
  };
  if (existsSync(directory)) walk(directory);
  return paths.sort((a, b) => a.localeCompare(b, "es"));
}
