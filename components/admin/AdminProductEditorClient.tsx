"use client";

import { useCallback } from "react";
import Link from "next/link";
import ProductForm from "@/components/admin/ProductForm";
import { useAdminUserId } from "@/components/admin/AdminClientProvider";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { getCatalogEditorData } from "@/lib/admin/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminProductEditorClient({
  productId,
  assets,
}: {
  productId?: string;
  assets: Array<string | { path: string; label: string }>;
}) {
  const userId = useAdminUserId();
  const cacheKey = `admin:${userId}:editor:${productId ?? "new"}`;
  const loadEditor = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("No se pudo iniciar la conexión con el catálogo.");
    return getCatalogEditorData(supabase, productId, userId);
  }, [productId, userId]);
  const { data, loading, error } = useAdminQuery(cacheKey, loadEditor, {
    cache: Boolean(productId),
    invalidatePrefix: `admin:${userId}:`,
  });

  if (loading && !data) {
    return <main className="admin-content"><p className="catalog-status" role="status">Cargando editor…</p></main>;
  }
  if (error || !data) {
    return <main className="admin-content"><p className="admin-alert" role="alert">{error ?? "No se pudo cargar el editor."}</p></main>;
  }

  return (
    <main className="admin-content">
      <nav className="admin-breadcrumb"><Link href="/admin/products">PRODUCTOS</Link><span>/</span><span>{productId ? "EDITAR" : "NUEVO"}</span></nav>
      <div className="admin-page-heading">
        <div><span className="eyebrow">CATÁLOGO FINAL</span><h1>{productId ? "Editar producto" : "Nuevo producto"}</h1><p>{productId ? data.product.name : "Define el producto padre y sus combinaciones vendibles."}</p></div>
        {productId && <Link className="text-link" href={`/products/${data.product.slug}`} target="_blank">VISTA PÚBLICA ↗</Link>}
      </div>
      <ProductForm {...data} assets={assets} />
    </main>
  );
}
