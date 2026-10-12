"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { saveCatalogValueAction } from "@/app/admin/actions";
import CatalogValueTable, { type CatalogValueKind, type ManagedCatalogValue } from "@/components/admin/CatalogValueTable";
import { useAdminUserId } from "@/components/admin/AdminClientProvider";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type { CatalogValueKind };

const config: Record<CatalogValueKind, { title: string; singular: string; description: string; nameLabel: string }> = {
  categories: { title: "Categorías", singular: "categoría", description: "Organiza los productos en categorías principales y subcategorías.", nameLabel: "Nombre de la categoría" },
  colors: { title: "Colores", singular: "color", description: "Registra los colores que podrás asignar a productos y variantes.", nameLabel: "Nombre del color" },
  sizes: { title: "Tallas", singular: "talla", description: "Define el catálogo de tallas que se mostrará al crear productos.", nameLabel: "Nombre de la talla" },
  fits: { title: "Fit", singular: "fit", description: "Mantén los fits disponibles para asignarlos a los productos.", nameLabel: "Nombre del fit" },
};

export default function AdminCatalogValuesClient({ kind, saved, error }: { kind: CatalogValueKind; saved?: string; error?: string }) {
  const userId = useAdminUserId();
  const page = config[kind];
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const cacheKey = `admin:${userId}:${kind}:${refreshVersion}`;
  const loadValues = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("No se pudo iniciar la conexión con el catálogo.");
    const columns = kind === "colors" ? "id, name, sort_order, is_active, hex_color" : "id, name, sort_order, is_active";
    const { data, error: requestError } = await (supabase.from(kind) as any)
      .select(columns)
      .order("sort_order")
      .order("name");
    if (requestError) throw new Error(requestError.message);
    return (data ?? []) as ManagedCatalogValue[];
  }, [kind]);
  const { data, loading, error: loadError } = useAdminQuery(cacheKey, loadValues, {
    invalidatePrefix: `admin:${userId}:`,
    refreshToken: saved,
  });
  const handleChanged = useCallback((message: string) => {
    setNotice(message);
    setRefreshVersion((current) => current + 1);
  }, []);

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="eyebrow">VALORES DEL CATÁLOGO</span><h1>{page.title}</h1><p>{page.description}</p></div><Link href="/admin/products/new" className="outline-button">IR A PRODUCTOS</Link></div>
      {(saved || notice) && <p className="admin-success" role="status">{notice || `${page.singular} guardado.`}</p>}
      {error && <p className="admin-alert" role="alert">{error === "invalid" ? `Revisa el nombre${kind === "colors" ? " y el código hexadecimal" : ""}.` : `No se pudo guardar. Es posible que ya exista un ${page.singular} con ese nombre.`}</p>}
      {loadError && <p className="admin-alert" role="alert">No se pudieron cargar los valores: {loadError}</p>}
      <section className="admin-form-section admin-value-editor">
        <h2>Nuevo {page.singular}</h2>
        <form action={saveCatalogValueAction} className="admin-form-grid">
          <input type="hidden" name="table" value={kind} />
          <label className="admin-field">{page.nameLabel}<input name="name" required maxLength={kind === "sizes" ? 40 : 100} placeholder={kind === "sizes" ? "M" : kind === "colors" ? "Azul" : kind === "fits" ? "Wide leg" : "Polos"} /></label>
          {kind === "colors" && <label className="admin-field">Color de muestra<span className="admin-hex-field"><input type="color" name="hex_color" defaultValue="#4267a8" aria-label="Elegir color" /><small>Opcional; sirve como referencia visual.</small></span></label>}
          <button className="dark-button" type="submit">GUARDAR {page.singular.toUpperCase()}</button>
        </form>
      </section>
      <section className="admin-form-section">
        <h2>{page.title} registrados</h2>
        {loading && !data ? <p className="catalog-status" role="status">Cargando {page.title.toLowerCase()}…</p> : data?.length ? (
          <CatalogValueTable kind={kind} values={data} onChanged={handleChanged} />
        ) : <p className="admin-gallery-empty">Todavía no hay {page.title.toLowerCase()} registrados.</p>}
      </section>
    </main>
  );
}
