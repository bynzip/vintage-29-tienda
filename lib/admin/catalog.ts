import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminCatalogProduct } from "@/components/admin/ProductForm";
import { isCurrentPrice } from "@/lib/catalog/pricing";
import { loadAdminData } from "@/lib/admin/query-cache";

type CatalogValue = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  hex_color?: string | null;
};
type EditorConfig = {
  categories: Array<{ id: string; name: string; parent_name: string }>;
  colors: CatalogValue[];
  sizes: CatalogValue[];
  fits: CatalogValue[];
  priceListId: string;
  warehouseId: string;
};

async function readEditorConfig(
  supabase: SupabaseClient<Database>,
): Promise<EditorConfig> {
  const [
    categoriesResult,
    colorsResult,
    sizesResult,
    fitsResult,
    configResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, parent_id")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("colors")
      .select("id, name, slug, sort_order, hex_color")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("sizes")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("fits")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("catalog_settings")
      .select("price_list_id, warehouse_id")
      .single(),
  ]);

  const error =
    categoriesResult.error ??
    colorsResult.error ??
    sizesResult.error ??
    fitsResult.error ??
    configResult.error;
  if (error)
    throw new Error(
      error.message ?? "No se pudo cargar la configuración del catálogo.",
    );

  const allCategories = categoriesResult.data ?? [];
  const categoryNames = new Map(
    allCategories.map((category) => [category.id, category.name]),
  );
  return {
    categories: allCategories
      .filter((category) => category.parent_id)
      .map((category) => ({
        id: category.id,
        name: category.name,
        parent_name: String(
          categoryNames.get(category.parent_id ?? "") ?? "Categoría",
        ),
      })),
    colors: colorsResult.data ?? [],
    sizes: sizesResult.data ?? [],
    fits: fitsResult.data ?? [],
    priceListId: configResult.data?.price_list_id ?? "",
    warehouseId: configResult.data?.warehouse_id ?? "",
  };
}

function getEditorConfig(
  supabase: SupabaseClient<Database>,
  cacheScope: string,
) {
  return loadAdminData(
    `admin:${cacheScope}:editor-config`,
    () => readEditorConfig(supabase),
    30_000,
  );
}

export async function getCatalogEditorData(
  supabase: SupabaseClient<Database>,
  productId?: string,
  cacheScope = "session",
  draftId?: string,
) {
  const config = await getEditorConfig(supabase, cacheScope);
  if (!productId) {
    return {
      product: {
        id: draftId ?? crypto.randomUUID(),
        name: "",
        slug: "",
        description: null,
        short_description: null,
        subcategory_id: null,
        gender: "female" as const,
        fit_id: null,
        material_summary: null,
        care_instructions: null,
        status: "draft" as const,
        is_featured: false,
        color_ids: [],
        size_ids: [],
        variants: [],
        media: [],
      } satisfies AdminCatalogProduct,
      ...config,
    };
  }

  const [
    productResult,
    variantsResult,
    mediaResult,
    colorsResult,
    sizesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, description, short_description, subcategory_id, gender, fit_id, material_summary, care_instructions, status, is_featured, updated_at",
      )
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("product_variants")
      .select("id, color_id, size_id, sku, variant_name, position, is_active")
      .eq("product_id", productId)
      .order("is_active", { ascending: false })
      .order("position"),
    supabase
      .from("product_media")
      .select(
        "id, color_id, asset_path, alt_text, position, is_primary, is_lifestyle",
      )
      .eq("product_id", productId)
      .order("position"),
    supabase
      .from("product_colors")
      .select("color_id, position")
      .eq("product_id", productId)
      .order("position"),
    supabase
      .from("product_sizes")
      .select("size_id, position")
      .eq("product_id", productId)
      .order("position"),
  ]);
  const product = productResult.data;
  if (productResult.error || !product)
    throw new Error(productResult.error?.message ?? "Producto no encontrado.");
  const childError =
    variantsResult.error ??
    mediaResult.error ??
    colorsResult.error ??
    sizesResult.error;
  if (childError)
    throw new Error(childError.message ?? "No se pudo cargar el editor.");

  const variants = variantsResult.data ?? [];
  const variantIds = variants.map((variant) => variant.id);
  const [pricesResult, inventoryResult] = await Promise.all([
    variantIds.length
      ? supabase
          .from("variant_prices")
          .select(
            "variant_id, amount_cents, price_list_id, is_active, starts_at, ends_at",
          )
          .in("variant_id", variantIds)
          .eq("price_list_id", config.priceListId)
          .eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? supabase
          .from("inventory_levels")
          .select("variant_id, quantity_on_hand, quantity_reserved")
          .in("variant_id", variantIds)
          .eq("warehouse_id", config.warehouseId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const detailError = pricesResult.error ?? inventoryResult.error;
  if (detailError)
    throw new Error(detailError.message ?? "No se pudo cargar el editor.");

  const namesById = new Map<string, string>([
    ...config.colors.map((value) => [value.id, value.name] as [string, string]),
    ...config.sizes.map((value) => [value.id, value.name] as [string, string]),
  ]);
  const variantsForForm = variants
    .filter(
      (variant, index, rows) =>
        rows.findIndex(
          (row) =>
            row.color_id === variant.color_id &&
            row.size_id === variant.size_id,
        ) === index,
    )
    .map((variant) => {
      const price = (pricesResult.data ?? []).find(
        (item) => item.variant_id === variant.id && isCurrentPrice(item),
      );
      const stock = (inventoryResult.data ?? []).find(
        (item) => item.variant_id === variant.id,
      );
      const generatedName = [variant.color_id, variant.size_id]
        .map((id) => (id ? namesById.get(id) : null))
        .filter(Boolean)
        .join(" / ");
      return {
        id: variant.id,
        color_id: variant.color_id,
        size_id: variant.size_id,
        sku: variant.sku ?? "",
        variant_name: variant.variant_name || generatedName,
        amount_cents: price?.amount_cents ?? null,
        quantity_on_hand: stock?.quantity_on_hand ?? 0,
        quantity_reserved: stock?.quantity_reserved ?? 0,
        is_active: variant.is_active,
        position: variant.position,
      };
    });

  return {
    product: {
      ...product,
      status: product.status as AdminCatalogProduct["status"],
      gender: "female" as const,
      color_ids: (colorsResult.data ?? []).map((item) => item.color_id),
      size_ids: (sizesResult.data ?? []).map((item) => item.size_id),
      variants: variantsForForm.filter(
        (variant) =>
          (!variant.color_id ||
            (colorsResult.data ?? []).some(
              (pc) => pc.color_id === variant.color_id,
            )) &&
          (!variant.size_id ||
            (sizesResult.data ?? []).some(
              (ps) => ps.size_id === variant.size_id,
            )),
      ),
      archived_variants: variantsForForm,
      media: (mediaResult.data ?? []).map((item) => ({
        ...item,
        alt_text: item.alt_text ?? product.name,
      })),
    } satisfies AdminCatalogProduct,
    ...config,
    priceListId: config.priceListId,
  };
}
