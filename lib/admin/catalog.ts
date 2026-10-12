import type { AdminCatalogProduct } from "@/components/admin/ProductForm";
import { loadAdminData } from "@/lib/admin/query-cache";

type CatalogValue = { id: string; name: string; slug: string; sort_order: number; hex_color?: string | null };
type EditorConfig = {
  categories: Array<{ id: string; name: string; parent_name: string }>;
  colors: CatalogValue[];
  sizes: CatalogValue[];
  fits: CatalogValue[];
  priceListId: string;
  warehouseId: string;
};

async function readEditorConfig(supabase: any): Promise<EditorConfig> {
  const [categoriesResult, colorsResult, sizesResult, fitsResult, priceListsResult, warehousesResult] = await Promise.all([
    supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order"),
    supabase.from("colors").select("id, name, slug, sort_order, hex_color").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("sizes").select("id, name, slug, sort_order").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("fits").select("id, name, slug, sort_order").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("price_lists").select("id, name").eq("is_active", true).order("created_at").limit(1),
    supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("created_at").limit(1),
  ]);

  const error = categoriesResult.error ?? colorsResult.error ?? sizesResult.error ?? fitsResult.error
    ?? priceListsResult.error ?? warehousesResult.error;
  if (error) throw new Error(error.message ?? "No se pudo cargar la configuración del catálogo.");

  const allCategories = categoriesResult.data ?? [];
  const categoryNames = new Map(allCategories.map((category: any) => [category.id, category.name]));
  return {
    categories: allCategories
      .filter((category: any) => category.parent_id)
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        parent_name: String(categoryNames.get(category.parent_id) ?? "Categoría"),
      })),
    colors: colorsResult.data ?? [],
    sizes: sizesResult.data ?? [],
    fits: fitsResult.data ?? [],
    priceListId: priceListsResult.data?.[0]?.id ?? "",
    warehouseId: warehousesResult.data?.[0]?.id ?? "",
  };
}

function getEditorConfig(supabase: any, cacheScope: string) {
  return loadAdminData(
    `admin:${cacheScope}:editor-config`,
    () => readEditorConfig(supabase),
    30_000,
  );
}

export async function getCatalogEditorData(
  supabase: any,
  productId?: string,
  cacheScope = "session",
  draftId?: string,
) {
  const config = await getEditorConfig(supabase, cacheScope);
  if (!productId) {
    return {
      product: {
        id: draftId ?? crypto.randomUUID(), name: "", slug: "", description: null,
        short_description: null, subcategory_id: null, gender: "female" as const,
        fit_id: null, material_summary: null, care_instructions: null,
        status: "draft" as const, is_featured: false, color_ids: [], size_ids: [],
        variants: [], media: [],
      } satisfies AdminCatalogProduct,
      ...config,
    };
  }

  const [productResult, variantsResult, mediaResult, colorsResult, sizesResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, description, short_description, subcategory_id, gender, fit_id, material_summary, care_instructions, status, is_featured")
      .eq("id", productId)
      .maybeSingle(),
    supabase.from("product_variants").select("id, color_id, size_id, sku, variant_name, position, is_active").eq("product_id", productId).order("position"),
    supabase.from("product_media").select("id, asset_path, alt_text, position, is_primary, is_lifestyle").eq("product_id", productId).order("position"),
    supabase.from("product_colors").select("color_id, position").eq("product_id", productId).order("position"),
    supabase.from("product_sizes").select("size_id, position").eq("product_id", productId).order("position"),
  ]);
  const product = productResult.data;
  if (productResult.error || !product) throw new Error(productResult.error?.message ?? "Producto no encontrado.");
  const childError = variantsResult.error ?? mediaResult.error ?? colorsResult.error ?? sizesResult.error;
  if (childError) throw new Error(childError.message ?? "No se pudo cargar el editor.");

  const variants = variantsResult.data ?? [];
  const variantIds = variants.map((variant: any) => variant.id);
  const [pricesResult, inventoryResult] = await Promise.all([
    variantIds.length
      ? supabase.from("variant_prices").select("variant_id, amount_cents, price_list_id, is_active").in("variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? supabase.from("inventory_levels").select("variant_id, quantity_on_hand, quantity_reserved").in("variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const detailError = pricesResult.error ?? inventoryResult.error;
  if (detailError) throw new Error(detailError.message ?? "No se pudo cargar el editor.");

  const namesById = new Map<string, string>([
    ...config.colors.map((value) => [value.id, value.name] as [string, string]),
    ...config.sizes.map((value) => [value.id, value.name] as [string, string]),
  ]);
  const variantsForForm = variants.map((variant: any) => {
    const price = (pricesResult.data ?? []).find(
      (item: any) => item.variant_id === variant.id && item.is_active,
    );
    const stock = (inventoryResult.data ?? []).find((item: any) => item.variant_id === variant.id);
    const generatedName = [variant.color_id, variant.size_id]
      .map((id) => id ? namesById.get(id) : null)
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
      gender: "female" as const,
      color_ids: (colorsResult.data ?? []).map((item: any) => item.color_id),
      size_ids: (sizesResult.data ?? []).map((item: any) => item.size_id),
      variants: variantsForForm,
      media: mediaResult.data ?? [],
    } satisfies AdminCatalogProduct,
    ...config,
    priceListId: config.priceListId || pricesResult.data?.[0]?.price_list_id || "",
  };
}
