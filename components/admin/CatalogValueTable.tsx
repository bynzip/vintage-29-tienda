"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { deleteCatalogValueAction, updateCatalogValueAction } from "@/app/admin/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type CatalogValueKind = "categories" | "colors" | "sizes" | "fits";
export type ManagedCatalogValue = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  hex_color?: string | null;
  parent_id?: string | null;
  description?: string | null;
  parent_name?: string | null;
};

type RelatedProduct = { id: string; name: string; status: string };
type SelectedValue = { value: ManagedCatalogValue; mode: "edit" | "delete" };

const labels: Record<CatalogValueKind, { name: string; filter: string }> = {
  categories: { name: "Categoría", filter: "category" },
  colors: { name: "Color", filter: "color" },
  sizes: { name: "Talla", filter: "size" },
  fits: { name: "Fit", filter: "fit" },
};

async function findRelatedProducts(kind: CatalogValueKind, value: ManagedCatalogValue): Promise<{ products: RelatedProduct[]; variantCount: number }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("No se pudo iniciar la conexión con el catálogo.");
  let productIds: string[] = [];
  let variantCount = 0;

  if (kind === "categories") {
    const { data: children, error: childrenError } = await supabase.from("categories").select("id").eq("parent_id", value.id);
    if (childrenError) throw new Error(childrenError.message);
    const categoryIds = [value.id, ...(children ?? []).map((category) => category.id)];
    const [subcategoryResult, legacyCategoryResult] = await Promise.all([
      supabase.from("products").select("id").in("subcategory_id", categoryIds),
      supabase.from("products").select("id").in("category_id", categoryIds),
    ]);
    if (subcategoryResult.error || legacyCategoryResult.error) {
      throw new Error(subcategoryResult.error?.message ?? legacyCategoryResult.error?.message);
    }
    productIds = [...(subcategoryResult.data ?? []), ...(legacyCategoryResult.data ?? [])].map((product) => product.id);
  } else if (kind === "colors") {
    const [links, variants] = await Promise.all([
      supabase.from("product_colors").select("product_id").eq("color_id", value.id),
      supabase.from("product_variants").select("product_id").eq("color_id", value.id),
    ]);
    if (links.error || variants.error) throw new Error(links.error?.message ?? variants.error?.message);
    productIds = [...(links.data ?? []), ...(variants.data ?? [])].map((row) => row.product_id);
    variantCount = variants.data?.length ?? 0;
  } else if (kind === "sizes") {
    const [links, variants] = await Promise.all([
      supabase.from("product_sizes").select("product_id").eq("size_id", value.id),
      supabase.from("product_variants").select("product_id").eq("size_id", value.id),
    ]);
    if (links.error || variants.error) throw new Error(links.error?.message ?? variants.error?.message);
    productIds = [...(links.data ?? []), ...(variants.data ?? [])].map((row) => row.product_id);
    variantCount = variants.data?.length ?? 0;
  } else {
    const { data, error } = await supabase.from("products").select("id").eq("fit_id", value.id);
    if (error) throw new Error(error.message);
    productIds = (data ?? []).map((product) => product.id);
  }

  const uniqueProductIds = [...new Set(productIds)];
  if (!uniqueProductIds.length) return { products: [], variantCount };
  const { data, error } = await supabase.from("products").select("id, name, status").in("id", uniqueProductIds).order("name");
  if (error) throw new Error(error.message);
  return { products: (data ?? []) as RelatedProduct[], variantCount };
}

export default function CatalogValueTable({
  kind,
  values,
  onChanged,
}: {
  kind: CatalogValueKind;
  values: ManagedCatalogValue[];
  onChanged: (message: string) => void;
}) {
  const [selected, setSelected] = useState<SelectedValue | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [relatedVariants, setRelatedVariants] = useState(0);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const handleChanged = useCallback((message: string) => {
    onChanged(message);
    setSelected(null);
  }, [onChanged]);

  useEffect(() => {
    let active = true;
    if (!selected || selected.mode !== "delete") {
      setRelated([]);
      setRelatedVariants(0);
      setRelatedError("");
      return () => { active = false; };
    }
    setRelatedLoading(true);
    setRelatedError("");
    void findRelatedProducts(kind, selected.value).then(
      (result) => { if (active) { setRelated(result.products); setRelatedVariants(result.variantCount); } },
      (error: unknown) => { if (active) setRelatedError(error instanceof Error ? error.message : "No se pudieron consultar los productos relacionados."); },
    ).finally(() => { if (active) setRelatedLoading(false); });
    return () => { active = false; };
  }, [kind, selected?.mode, selected?.value.id]);

  const info = labels[kind];
  return (
    <>
      <div className="admin-table-wrap">
        <table className="admin-table admin-catalog-table">
          <thead><tr><th>{info.name}</th>{kind === "categories" && <><th>Tipo</th><th>Categoría principal</th></>}<th>Acciones</th></tr></thead>
          <tbody>{values.map((value) => (
            <tr key={value.id}>
              <td>
                {kind === "colors" && <span className="admin-color-swatch" style={{ backgroundColor: value.hex_color ?? "#fff" }} aria-hidden="true" />}
                <Link className="admin-catalog-value-link" href={`/admin/products?${info.filter}=${value.id}`}>{value.name}<ExternalLink size={12} aria-hidden="true" /></Link>
              </td>
              {kind === "categories" && <>
                <td>{value.parent_id ? "Subcategoría" : "Principal"}</td>
                <td>{value.parent_name ?? "—"}</td>
              </>}
              <td><div className="admin-row-actions">
                <button type="button" onClick={() => setSelected({ value, mode: "edit" })}><Pencil size={13} /> Editar</button>
                <button type="button" onClick={() => setSelected({ value, mode: "delete" })}><Trash2 size={13} /> Eliminar</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {selected && <CatalogValueDialog
        key={`${kind}-${selected.value.id}-${selected.mode}`}
        kind={kind}
        selected={selected}
        related={related}
        relatedVariants={relatedVariants}
        relatedLoading={relatedLoading}
        relatedError={relatedError}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />}
    </>
  );
}

function CatalogValueDialog({
  kind,
  selected,
  related,
  relatedVariants,
  relatedLoading,
  relatedError,
  onClose,
  onChanged,
}: {
  kind: CatalogValueKind;
  selected: SelectedValue;
  related: RelatedProduct[];
  relatedVariants: number;
  relatedLoading: boolean;
  relatedError: string;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [editState, editAction, editPending] = useActionState(updateCatalogValueAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCatalogValueAction, {});
  const [confirmed, setConfirmed] = useState(false);
  const { value, mode } = selected;
  const isEdit = mode === "edit";

  useEffect(() => {
    if (editState.success) onChanged(`${labels[kind].name} actualizado.`);
  }, [editState.success, kind, onChanged]);

  useEffect(() => {
    if (!deleteState.success) return;
    const affected = deleteState.affectedProducts ?? 0;
    const message = kind === "fits"
      ? `${labels[kind].name} eliminado. Se quitó la relación de ${affected} ${affected === 1 ? "producto" : "productos"}.`
      : `${labels[kind].name} eliminado. ${affected} ${affected === 1 ? "producto pasó" : "productos pasaron"} a borrador.`;
    onChanged(message);
  }, [deleteState.affectedProducts, deleteState.success, kind, onChanged]);

  const title = isEdit ? `Editar ${labels[kind].name.toLowerCase()}` : `Eliminar ${labels[kind].name.toLowerCase()}`;
  const filterHref = `/admin/products?${labels[kind].filter}=${value.id}`;
  const deleteCopy = kind === "fits"
    ? <>Se eliminará <strong>{value.name}</strong> del catálogo y se quitará la relación de los productos que lo usaban. Los productos no se borran y conservan su estado.</>
    : kind === "categories"
      ? <>Se eliminará <strong>{value.name}</strong> junto con sus subcategorías. Los productos relacionados no se borran: perderán la categoría asignada y, si estaban publicados, pasarán a borrador.</>
      : <>Se eliminará <strong>{value.name}</strong> del catálogo. Los productos no se borran: perderán este {kind === "colors" ? "color" : "talla"}, sus variantes que lo usaban se eliminarán también y, si estaban publicados, pasarán a borrador.</>;

  return (
    <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="catalog-value-dialog-title">
        <div className="admin-dialog-heading"><div><span className="eyebrow">{labels[kind].name.toUpperCase()}</span><h2 id="catalog-value-dialog-title">{title}</h2></div><button type="button" className="admin-dialog-close" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
        {isEdit ? <form action={editAction} className="admin-dialog-form">
          <input type="hidden" name="table" value={kind} />
          <input type="hidden" name="id" value={value.id} />
          <label className="admin-field">Nombre<input name="name" defaultValue={value.name} required maxLength={kind === "sizes" ? 40 : kind === "categories" ? 120 : 100} autoFocus /></label>
          {kind === "colors" && <label className="admin-field">Color de muestra<span className="admin-hex-field"><input type="color" name="hex_color" defaultValue={value.hex_color ?? "#ffffff"} /><small>Referencia visual opcional.</small></span></label>}
          {kind === "categories" && <label className="admin-field">Descripción<textarea name="description" defaultValue={value.description ?? ""} rows={3} maxLength={1000} /></label>}
          {editState.error && <p className="admin-alert" role="alert">{editState.error}</p>}
          <div className="admin-dialog-actions"><button type="button" className="outline-button" onClick={onClose}>CANCELAR</button><button type="submit" className="dark-button" disabled={editPending}>{editPending ? "GUARDANDO…" : "GUARDAR CAMBIOS"}</button></div>
        </form> : <form action={deleteAction} className="admin-dialog-form">
          <input type="hidden" name="table" value={kind} />
          <input type="hidden" name="id" value={value.id} />
          <p className="admin-dialog-copy">{deleteCopy} Esta acción no se puede deshacer.</p>
          {relatedLoading ? <p className="catalog-status" role="status">Buscando productos relacionados…</p> : relatedError ? <p className="admin-alert" role="alert">No se pudo comprobar qué productos usan este valor: {relatedError}</p> : related.length ? <>
            {relatedVariants > 0 && <p className="admin-dialog-copy">También se eliminarán <strong>{relatedVariants}</strong> {relatedVariants === 1 ? "variante" : "variantes"} que usan este valor.</p>}
            <p className="admin-dialog-subtitle">Productos afectados ({related.length})</p>
            <ul className="admin-related-products">{related.map((product) => <li key={product.id}><Link href={`/admin/products/${product.id}/edit`} onClick={onClose}>{product.name}</Link><span>{product.status === "published" ? "Publicado" : product.status === "archived" ? "Archivado" : "Borrador"}</span></li>)}</ul>
          </> : <p className="admin-dialog-copy">No hay productos relacionados. Se eliminará sin afectar nada más.</p>}
          <label className="admin-confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} /><span>Confirmo la eliminación definitiva y entiendo el cambio de estado de los productos.</span></label>
          {deleteState.error && <p className="admin-alert" role="alert">{deleteState.error}</p>}
          <div className="admin-dialog-actions"><button type="button" className="outline-button" onClick={onClose}>CANCELAR</button><button type="submit" className="dark-button" disabled={!confirmed || relatedLoading || Boolean(relatedError) || deletePending}>{deletePending ? "ELIMINANDO…" : "ELIMINAR VALOR"}</button></div>
        </form>}
        {!isEdit && <Link className="admin-dialog-filter-link" href={filterHref} onClick={onClose}>VER PRODUCTOS CON ESTE VALOR</Link>}
      </section>
    </div>
  );
}
