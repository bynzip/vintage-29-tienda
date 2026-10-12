"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { setProductStatusAction } from "@/app/admin/actions";
import ArchiveButton from "@/components/admin/ArchiveButton";
import { useAdminUserId } from "@/components/admin/AdminClientProvider";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ProductRow = {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  updated_at: string;
  product_variants?: Array<{
    variant_prices?: Array<{ amount_cents: number; is_active: boolean }>;
  }>;
};
type FilterOption = { id: string; name: string; parent_id?: string | null };
type ProductsData = {
  products: ProductRow[];
  categories: FilterOption[];
  colors: FilterOption[];
  sizes: FilterOption[];
  fits: FilterOption[];
};

type AdminProductsClientProps = {
  query: string;
  categoryId?: string;
  colorId?: string;
  sizeId?: string;
  fitId?: string;
  saved?: string;
  error?: string;
};
export default function AdminProductsClient({
  query,
  categoryId,
  colorId,
  sizeId,
  fitId,
  saved,
  error,
}: AdminProductsClientProps) {
  const userId = useAdminUserId();
  const filtersKey = [categoryId, colorId, sizeId, fitId].join(":");
  const cacheKey = `admin:${userId}:products:${filtersKey}:${query}`;
  const loadProducts = useCallback(async (): Promise<ProductsData> => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("No se pudo iniciar la conexión con el catálogo.");

    const [categoriesResult, colorsResult, sizesResult, fitsResult] = await Promise.all([
      supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("colors").select("id, name").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("sizes").select("id, name").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("fits").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    ]);
    const filterError = categoriesResult.error ?? colorsResult.error ?? sizesResult.error ?? fitsResult.error;
    if (filterError) throw new Error(filterError.message);

    const candidateSets: string[][] = [];
    if (categoryId) {
      const selectedCategory = (categoriesResult.data ?? []).find((category) => category.id === categoryId);
      const childIds = (categoriesResult.data ?? []).filter((category) => category.parent_id === categoryId).map((category) => category.id);
      const categoryIds = selectedCategory?.parent_id ? [categoryId] : [categoryId, ...childIds];
      const [subcategories, legacyCategories] = await Promise.all([
        supabase.from("products").select("id").in("subcategory_id", categoryIds),
        supabase.from("products").select("id").in("category_id", categoryIds),
      ]);
      if (subcategories.error || legacyCategories.error) throw new Error(subcategories.error?.message ?? legacyCategories.error?.message);
      candidateSets.push([...new Set([...(subcategories.data ?? []), ...(legacyCategories.data ?? [])].map((product) => product.id))]);
    }
    if (colorId) {
      const [links, variants] = await Promise.all([
        supabase.from("product_colors").select("product_id").eq("color_id", colorId),
        supabase.from("product_variants").select("product_id").eq("color_id", colorId),
      ]);
      if (links.error || variants.error) throw new Error(links.error?.message ?? variants.error?.message);
      candidateSets.push([...new Set([...(links.data ?? []), ...(variants.data ?? [])].map((row) => row.product_id))]);
    }
    if (sizeId) {
      const [links, variants] = await Promise.all([
        supabase.from("product_sizes").select("product_id").eq("size_id", sizeId),
        supabase.from("product_variants").select("product_id").eq("size_id", sizeId),
      ]);
      if (links.error || variants.error) throw new Error(links.error?.message ?? variants.error?.message);
      candidateSets.push([...new Set([...(links.data ?? []), ...(variants.data ?? [])].map((row) => row.product_id))]);
    }
    if (fitId) {
      const { data, error: attributeError } = await supabase.from("products").select("id").eq("fit_id", fitId);
      if (attributeError) throw new Error(attributeError.message);
      candidateSets.push((data ?? []).map((product) => product.id));
    }

    const candidateIds = candidateSets.length
      ? candidateSets.slice(1).reduce((current, next) => current.filter((id) => next.includes(id)), candidateSets[0])
      : null;
    let request = supabase
      .from("products")
      .select("id, name, status, updated_at, product_variants(variant_prices(amount_cents, is_active))")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (query) request = request.ilike("name", `%${query}%`);
    if (candidateIds) request = request.in("id", candidateIds);
    if (candidateIds?.length === 0) {
      return {
        products: [],
        categories: (categoriesResult.data ?? []) as FilterOption[],
        colors: (colorsResult.data ?? []) as FilterOption[],
        sizes: (sizesResult.data ?? []) as FilterOption[],
        fits: (fitsResult.data ?? []) as FilterOption[],
      };
    }

    const { data, error: requestError } = await request;
    if (requestError) throw new Error(requestError.message);
    return {
      products: (data ?? []) as unknown as ProductRow[],
      categories: (categoriesResult.data ?? []) as FilterOption[],
      colors: (colorsResult.data ?? []) as FilterOption[],
      sizes: (sizesResult.data ?? []) as FilterOption[],
      fits: (fitsResult.data ?? []) as FilterOption[],
    };
  }, [categoryId, colorId, fitId, query, sizeId]);

  const { data, loading, error: loadError } = useAdminQuery(cacheKey, loadProducts, {
    invalidatePrefix: `admin:${userId}:`,
    refreshToken: saved,
  });

  const products = data?.products ?? [];
  const errorMessages: Record<string, string> = {
    variant: "Para publicar, agrega al menos una variante activa con SKU y precio en una lista de precios.",
    subcategory: "Para publicar, edita el producto y asígnale una subcategoría.",
    colors: "Para publicar, el producto necesita al menos un color.",
    sizes: "Para publicar, el producto necesita al menos una talla.",
    media: "Para publicar, añade al menos una imagen al producto.",
  };
  const statusMessage = error ? (errorMessages[error] ?? "No se pudo completar la acción solicitada.") : null;
  const categories = data?.categories ?? [];
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><span className="eyebrow">CATÁLOGO</span><h1>Productos</h1><p>{loading && !data ? "Cargando catálogo…" : `${products.length} en esta vista`}</p></div>
        <Link className="dark-button" href="/admin/products/new"><Plus size={16} /> NUEVO PRODUCTO</Link>
      </div>
      {saved && <p className="admin-success" role="status">Cambios guardados.</p>}
      {statusMessage && <p className="admin-alert" role="alert">{statusMessage}</p>}
      {loadError && <p className="admin-alert" role="alert">No pudimos cargar los productos: {loadError}</p>}
      <form className="admin-product-filters" action="/admin/products" role="search">
        <label className="admin-field">Buscar<input name="q" type="search" defaultValue={query} placeholder="Nombre del producto" /></label>
        <label className="admin-field">Categoría<select key={`category-${categories.length}-${categoryId ?? "all"}`} name="category" defaultValue={categoryId ?? ""}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.parent_id ? `${categoryNames.get(category.parent_id) ?? "Categoría"} / ${category.name}` : category.name}</option>)}</select></label>
        <label className="admin-field">Color<select key={`color-${data?.colors.length ?? 0}-${colorId ?? "all"}`} name="color" defaultValue={colorId ?? ""}><option value="">Todos</option>{(data?.colors ?? []).map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select></label>
        <label className="admin-field">Talla<select key={`size-${data?.sizes.length ?? 0}-${sizeId ?? "all"}`} name="size" defaultValue={sizeId ?? ""}><option value="">Todas</option>{(data?.sizes ?? []).map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}</select></label>
        <label className="admin-field">Fit<select key={`fit-${data?.fits.length ?? 0}-${fitId ?? "all"}`} name="fit" defaultValue={fitId ?? ""}><option value="">Todos</option>{(data?.fits ?? []).map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}</select></label>
        <div className="admin-filter-actions"><button className="dark-button" type="submit"><Search size={15} /> APLICAR FILTROS</button><Link className="text-link" href="/admin/products">LIMPIAR</Link></div>
      </form>
      {loading && !data ? (
        <p className="catalog-status" role="status">Cargando productos…</p>
      ) : products.length === 0 ? (
        <section className="admin-empty"><h2>No hay productos con estos filtros.</h2><p>Prueba otros valores o limpia los filtros.</p></section>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-products-table">
            <thead>
              <tr>
                <th className="admin-col-product">Producto</th>
                <th className="admin-col-stat">Precio</th>
                <th className="admin-col-stat">Actualizado</th>
                <th className="admin-col-stat">Estado</th>
                <th className="admin-col-stat">Archivar</th>
              </tr>
            </thead>
            <tbody>{products.map((product) => {
              const prices = product.product_variants
                ?.flatMap((variant) => variant.variant_prices ?? [])
                .filter((price) => price.is_active)
                .map((price) => price.amount_cents / 100) ?? [];
              const lowestPrice = prices.length ? Math.min(...prices) : null;
              return (
                <tr key={product.id}>
                  <td className="admin-col-product"><Link className="admin-product-name" href={`/admin/products/${product.id}/edit`}>{product.name}</Link></td>
                  <td className="admin-col-stat">{lowestPrice !== null ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(lowestPrice) : "—"}</td>
                  <td className="admin-col-stat">{new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(product.updated_at))}</td>
                  <td className="admin-col-stat">
                    {product.status === "archived" ? (
                      <span className="status-pill status-archived">Archivado</span>
                    ) : (
                      <form action={setProductStatusAction} className="admin-switch-form">
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="status" value={product.status === "published" ? "draft" : "published"} />
                        <button
                          type="submit"
                          role="switch"
                          aria-checked={product.status === "published"}
                          aria-label={product.status === "published" ? `Despublicar ${product.name}` : `Publicar ${product.name}`}
                          title={product.status === "published" ? "Publicado (clic para pasar a borrador)" : "Borrador (clic para publicar)"}
                          className={`admin-switch${product.status === "published" ? " is-on" : ""}`}
                        ><span /></button>
                      </form>
                    )}
                  </td>
                  <td className="admin-col-stat">
                    {product.status !== "archived" ? (
                      <ArchiveButton productId={product.id} action={setProductStatusAction} />
                    ) : (
                      <span className="admin-empty-dash">—</span>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
