import "server-only";

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { QueryData, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  createSupabasePublicClient,
  hasSupabaseConfig,
  getActiveAdmin,
} from "@/lib/supabase/server";
import { readAllPages } from "@/lib/supabase/pagination";
import { isCatalogMediaUrl } from "@/lib/catalog/validation";
import type { CatalogProduct, CatalogResult } from "@/lib/catalog/types";
export type { CatalogProduct, CatalogResult } from "@/lib/catalog/types";

function catalogQuery(supabase: SupabaseClient<Database>) {
  return supabase
    .from("products")
    .select(
      `
    id, subcategory_id, name, slug, description, short_description, gender, fit_id,
    material_summary, care_instructions, status, is_featured, deleted_at, created_at, updated_at,
    product_media(id, color_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle),
    product_colors(color_id, position, color:colors!product_colors_color_id_fkey(id, name, hex_color)),
    product_sizes(position, size:sizes!product_sizes_size_id_fkey(id, name)),
    subcategory:categories!products_subcategory_id_fkey(id, name, slug, parent_id),
    fit:fits!products_fit_id_fkey(name)
  `,
    )
    .eq("status", "published")
    .is("deleted_at", null);
}
type SourceProduct = QueryData<ReturnType<typeof catalogQuery>>[number];
type PublicVariant =
  Database["public"]["Views"]["public_catalog_variants"]["Row"];

function mapProduct(
  product: SourceProduct,
  sourceVariants: PublicVariant[],
  compact = false,
): CatalogProduct {
  const colorMap = new Map(
    product.product_colors.flatMap((pc) =>
      pc.color ? [[pc.color_id, pc.color.name] as const] : [],
    ),
  );
  const assets = new Set(getImageAssetPaths());
  const media = [...product.product_media]
    .filter((item) => item.media_type === "image")
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
    )
    .filter(
      (item) =>
        isCatalogMediaUrl(item.asset_path) &&
        (item.asset_path.startsWith("http") || assets.has(item.asset_path)),
    )
    .map((item) => ({
      url: item.asset_path,
      order: item.position,
      lifestyle: item.is_lifestyle,
      alt: item.alt_text || product.name,
      colorId: item.color_id,
      colorName: item.color_id ? (colorMap.get(item.color_id) ?? null) : null,
    }));
  const variants = sourceVariants
    .filter((v) => v.product_id === product.id && v.id)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((v) => ({
      id: v.id!,
      colorId: v.color_id,
      sizeId: v.size_id,
      sku: v.sku,
      name: v.variant_name,
      price: v.amount_cents === null ? null : v.amount_cents / 100,
      available: Boolean(v.is_available && v.amount_cents),
    }));
  const prices = variants.flatMap((v) => (v.price === null ? [] : [v.price]));
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    shortDescription: product.short_description,
    category: product.subcategory?.name ?? null,
    categoryId: product.subcategory?.id ?? null,
    categorySlug: product.subcategory?.slug ?? null,
    parentCategoryId: product.subcategory?.parent_id ?? null,
    gender: product.gender as CatalogProduct["gender"],
    fit: product.fit?.name ?? null,
    material: product.material_summary,
    careInstructions: product.care_instructions,
    colors: [...product.product_colors]
      .sort((a, b) => a.position - b.position)
      .flatMap((pc) =>
        pc.color
          ? [
              {
                id: pc.color.id,
                name: pc.color.name,
                hexColor: pc.color.hex_color,
              },
            ]
          : [],
      ),
    sizes: [...product.product_sizes]
      .sort((a, b) => a.position - b.position)
      .flatMap((ps) => (ps.size ? [ps.size.name] : [])),
    sizeOptions: product.product_sizes.flatMap((ps) =>
      ps.size ? [{ id: ps.size.id, name: ps.size.name }] : [],
    ),
    price: prices.length ? Math.min(...prices) : null,
    available: variants.some((v) => v.available),
    cover: media[0]?.url ?? null,
    images: compact
      ? media.filter((item, index) => index < 2 || item.lifestyle)
      : media,
    variants,
  };
}

async function loadVariants(
  supabase: SupabaseClient<Database>,
  productIds: string[],
) {
  const variants: PublicVariant[] = [];
  for (let i = 0; i < productIds.length; i += 100) {
    variants.push(
      ...(await readAllPages((from, to) =>
        supabase
          .from("public_catalog_variants")
          .select("*")
          .in("product_id", productIds.slice(i, i + 100))
          .order("id")
          .range(from, to),
      )),
    );
  }
  return variants;
}
async function readPublishedProducts(): Promise<CatalogResult> {
  if (!hasSupabaseConfig()) return { status: "not-configured", products: [] };
  const supabase = createSupabasePublicClient();
  if (!supabase) return { status: "not-configured", products: [] };
  try {
    const products = await readAllPages((from, to) =>
      catalogQuery(supabase)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    const variants = await loadVariants(
      supabase,
      products.map((p) => p.id),
    );
    return {
      status: "ready",
      products: products.map((p) => mapProduct(p, variants, true)),
    };
  } catch (error) {
    console.error(
      "CATALOG_READ_FAILED",
      error instanceof Error ? error.message : "unknown",
    );
    return { status: "error", products: [] };
  }
}
export const getPublishedProducts = unstable_cache(
  readPublishedProducts,
  ["published-products-v2"],
  {
    revalidate: 60,
    tags: ["catalog"],
  },
);
async function readPublishedProductBySlug(slug: string) {
  if (!hasSupabaseConfig())
    return { status: "not-configured" as const, product: null };
  const supabase = createSupabasePublicClient();
  if (!supabase) return { status: "not-configured" as const, product: null };
  try {
    const { data, error } = await catalogQuery(supabase)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { status: "not-found" as const, product: null };
    const variants = await loadVariants(supabase, [data.id]);
    return { status: "ready" as const, product: mapProduct(data, variants) };
  } catch (error) {
    console.error(
      "PRODUCT_READ_FAILED",
      error instanceof Error ? error.message : "unknown",
    );
    return { status: "error" as const, product: null };
  }
}
export const getPublishedProductBySlug = cache(async (slug: string) =>
  unstable_cache(
    () => readPublishedProductBySlug(slug),
    ["published-product-v2", slug],
    { revalidate: 60, tags: ["catalog", `product:${slug}`] },
  )(),
);

const cachedImageAssetPaths = cache(() => getImageAssetPathsUncached());

export function getImageAssetPaths(
  directory = path.join(process.cwd(), "public", "imagenes"),
) {
  if (directory === path.join(process.cwd(), "public", "imagenes"))
    return cachedImageAssetPaths();
  return getImageAssetPathsUncached(directory);
}

function getImageAssetPathsUncached(
  directory = path.join(process.cwd(), "public", "imagenes"),
) {
  const paths: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(?:jpe?g|png|webp|avif)$/i.test(entry.name)) {
        paths.push(
          `/${path.relative(path.join(process.cwd(), "public"), absolute).replaceAll("\\", "/")}`,
        );
      }
    }
  };
  if (existsSync(directory)) walk(directory);
  return paths.sort((a, b) => a.localeCompare(b, "es"));
}

export type AvailableAsset = {
  path: string;
  label: string;
};

export async function getAvailableMediaAssets(): Promise<AvailableAsset[]> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return [];
  const assets = await readAllPages((from, to) =>
    supabase
      .from("media_assets")
      .select("public_url, file_name, file_path")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return [
    ...assets.map((item) => ({ path: item.public_url, label: item.file_name })),
    ...getImageAssetPaths().map((path) => ({
      path,
      label: path.split("/").pop() || path,
    })),
  ];
}
