"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { saveProductAction, uploadMediaAction, type ProductActionState } from "@/app/admin/actions";
import { buildVariantCombinations, type VariantDraft } from "@/lib/admin/variant-combinations";

type CatalogValue = { id: string; name: string; slug: string; sort_order: number; hex_color?: string | null };
type ProductVariant = VariantDraft;
type ProductMedia = { id: string; color_id?: string | null; asset_path: string; alt_text: string; position: number; is_primary: boolean; is_lifestyle: boolean };
export type AdminCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  subcategory_id: string | null;
  gender: "female";
  fit_id: string | null;
  material_summary: string | null;
  care_instructions: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  color_ids: string[];
  size_ids: string[];
  variants: ProductVariant[];
  media: ProductMedia[];
};

type VariantImpact = { id: string; name: string; sku: string; amount_cents: number | null; quantity_on_hand: number };
type RemovalRequest = { kind: "color" | "size"; label: string; affected: VariantImpact[]; apply: () => void };

function newId() { return crypto.randomUUID(); }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function toImpacts(variants: ProductVariant[]): VariantImpact[] {
  return variants.map((variant) => ({
    id: variant.id,
    name: variant.variant_name || "Variante",
    sku: variant.sku,
    amount_cents: variant.amount_cents,
    quantity_on_hand: variant.quantity_on_hand,
  }));
}

export default function ProductForm({
  product,
  categories,
  colors,
  sizes,
  fits,
  assets,
  priceListId,
  warehouseId,
}: {
  product: AdminCatalogProduct;
  categories: Array<{ id: string; name: string; parent_name: string }>;
  colors: CatalogValue[];
  sizes: CatalogValue[];
  fits: CatalogValue[];
  assets: string[];
  priceListId: string;
  warehouseId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(saveProductAction, {});
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugEdited] = useState(Boolean(product.slug));
  const [description, setDescription] = useState(product.description ?? "");
  const [shortDescription, setShortDescription] = useState(product.short_description ?? "");
  const [subcategoryId, setSubcategoryId] = useState(product.subcategory_id ?? "");
  const [fitId, setFitId] = useState(product.fit_id ?? "");
  const [materialSummary, setMaterialSummary] = useState(product.material_summary ?? "");
  const [care, setCare] = useState(product.care_instructions ?? "");
  const [featured, setFeatured] = useState(product.is_featured);
  const [published, setPublished] = useState(product.status === "published");
  const [colorRows, setColorRows] = useState<string[]>(product.color_ids);
  const [sizeIds, setSizeIds] = useState<string[]>(product.size_ids);
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);
  const [media, setMedia] = useState<ProductMedia[]>(product.media);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removalRequest, setRemovalRequest] = useState<RemovalRequest | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveRemovalConfirmed, setSaveRemovalConfirmed] = useState(false);

  useEffect(() => { if (state.success) router.push("/admin/products?saved=1"); }, [router, state.success]);

  const selectedColorIds = colorRows.filter(Boolean);
  const colorNames = useMemo(() => new Map(colors.map((color) => [color.id, color.name])), [colors]);
  const sizeNames = useMemo(() => new Map(sizes.map((size) => [size.id, size.name])), [sizes]);
  const colorOptions = useMemo(() => new Map(colors.map((color) => [color.id, color])), [colors]);

  // Las combinaciones de variantes se regeneran solas cada vez que cambian los
  // colores o las tallas, conservando SKU, precio, stock y estado de las
  // combinaciones que ya existían.
  const colorKey = selectedColorIds.join(",");
  const sizeKey = sizeIds.join(",");
  useEffect(() => {
    setVariants((existing) => (colorKey || sizeKey)
      ? buildVariantCombinations({
        existing,
        colorIds: colorKey ? colorKey.split(",") : [],
        sizeIds: sizeKey ? sizeKey.split(",") : [],
        colorNames,
        sizeNames,
        createId: newId,
      })
      : []);
  }, [colorKey, sizeKey, colorNames, sizeNames]);

  // Variantes guardadas en la base que desaparecerán al guardar porque su
  // color o su talla ya no están seleccionados para el producto.
  const removedVariants = useMemo(() => product.variants.filter((variant) =>
    (variant.color_id && !selectedColorIds.includes(variant.color_id))
    || (variant.size_id && !sizeIds.includes(variant.size_id))),
  [product.variants, selectedColorIds, sizeIds]);
  const removedKey = removedVariants.map((variant) => variant.id).sort().join(",");
  useEffect(() => { setSaveRemovalConfirmed(false); }, [removedKey]);
  useEffect(() => { if (saveRemovalConfirmed) formRef.current?.requestSubmit(); }, [saveRemovalConfirmed]);

  const missingForPublish = useMemo(() => {
    const missing: string[] = [];
    if (!subcategoryId) missing.push("subcategoría");
    if (!selectedColorIds.length) missing.push("al menos un color");
    if (!sizeIds.length) missing.push("al menos una talla");
    if (!media.length) missing.push("al menos una imagen");
    const hasSellableVariant = Boolean(priceListId)
      && variants.some((variant) => variant.is_active && variant.sku.trim() && variant.amount_cents && variant.amount_cents > 0);
    if (!hasSellableVariant) missing.push("una variante activa con SKU y precio");
    return missing;
  }, [media.length, priceListId, selectedColorIds.length, sizeIds.length, subcategoryId, variants]);

  const payload = useMemo(() => ({
    id: product.id,
    name,
    slug,
    description,
    short_description: shortDescription,
    subcategory_id: subcategoryId || null,
    gender: "female",
    fit_id: fitId || null,
    material_summary: materialSummary,
    care_instructions: care,
    status: published ? "published" : "draft",
    is_featured: featured,
    color_ids: selectedColorIds,
    size_ids: sizeIds,
    variants: variants.map((variant) => ({
      id: variant.id,
      color_id: variant.color_id,
      size_id: variant.size_id,
      variant_name: variant.variant_name,
      sku: variant.sku,
      is_active: variant.is_active,
      position: variant.position,
      prices: priceListId && variant.amount_cents ? [{ price_list_id: priceListId, amount_cents: variant.amount_cents, is_active: true, tax_included: true }] : [],
      inventory: warehouseId ? [{ warehouse_id: warehouseId, quantity_on_hand: variant.quantity_on_hand, quantity_reserved: variant.quantity_reserved, reorder_point: 1, incoming_quantity: 0 }] : [],
    })),
    media,
  }), [care, description, featured, fitId, materialSummary, media, name, priceListId, product.id, published, selectedColorIds, shortDescription, sizeIds, slug, subcategoryId, variants, warehouseId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (saveRemovalConfirmed || !removedVariants.length) return;
    event.preventDefault();
    setSaveDialogOpen(true);
  }

  function requestRemoveColor(index: number) {
    const colorId = colorRows[index];
    const apply = () => setColorRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    if (!colorId) { apply(); return; }
    const affected = variants.filter((variant) => variant.color_id === colorId);
    if (!affected.length) { apply(); return; }
    setRemovalRequest({ kind: "color", label: colorNames.get(colorId) ?? "este color", affected: toImpacts(affected), apply });
  }

  function requestChangeColor(index: number, nextColorId: string) {
    const previousColorId = colorRows[index];
    const apply = () => setColorRows((current) => current.map((value, rowIndex) => rowIndex === index ? nextColorId : value));
    if (!previousColorId || previousColorId === nextColorId) { apply(); return; }
    const affected = variants.filter((variant) => variant.color_id === previousColorId);
    if (!affected.length) { apply(); return; }
    setRemovalRequest({ kind: "color", label: colorNames.get(previousColorId) ?? "este color", affected: toImpacts(affected), apply });
  }

  function requestToggleSize(size: CatalogValue, checked: boolean) {
    const apply = () => setSizeIds((current) => checked ? [...current, size.id] : current.filter((id) => id !== size.id));
    if (checked || !sizeIds.includes(size.id)) { apply(); return; }
    const affected = variants.filter((variant) => variant.size_id === size.id);
    if (!affected.length) { apply(); return; }
    setRemovalRequest({ kind: "size", label: size.name, affected: toImpacts(affected), apply });
  }

  function addColorRow() {
    const availableColors = colors.filter((color) => !selectedColorIds.includes(color.id));
    if (availableColors.length) setColorRows((current) => [...current, ""]);
  }

  function updateVariant(index: number, update: Partial<ProductVariant>) {
    setVariants((current) => current.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...update } : variant));
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", slug || "products");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setUploadError(res.error || "No se pudo subir la imagen.");
      } else {
        const newAsset = res.publicUrl;
        setMedia((current) => [
          ...current,
          {
            id: newId(),
            color_id: null,
            asset_path: newAsset,
            alt_text: name,
            position: current.length,
            is_primary: current.length === 0,
            is_lifestyle: false,
          },
        ]);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addMedia() {
    if (!selectedAsset || media.some((item) => item.asset_path === selectedAsset)) return;
    setMedia((current) => [
      ...current,
      {
        id: newId(),
        color_id: null,
        asset_path: selectedAsset,
        alt_text: name,
        position: current.length,
        is_primary: current.length === 0,
        is_lifestyle: false,
      },
    ]);
  }

  return (
    <form action={formAction} ref={formRef} onSubmit={handleSubmit} className="admin-product-form">
      <input type="hidden" name="catalogJson" value={JSON.stringify(payload)} />
      {state.error && <p className="admin-alert" role="alert">{state.error}</p>}
      <div className="admin-product-top-grid">
        <section className="admin-form-section">
          <h2>Información general</h2>
          <div className="admin-form-stack">
            <label className="admin-field">Nombre<input value={name} required onChange={(event) => { const value = event.currentTarget.value; setName(value); if (!slugEdited) setSlug(slugify(value)); }} /></label>
            <label className="admin-field">Subcategoría<select value={subcategoryId} onChange={(event) => setSubcategoryId(event.currentTarget.value)}><option value="">Selecciona una subcategoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.parent_name} / {category.name}</option>)}</select><span>Obligatoria solo para publicar. Escribe el nombre para saltar al valor y pulsa Enter.</span></label>
            <label className="admin-field">Fit<select value={fitId} onChange={(event) => setFitId(event.currentTarget.value)}><option value="">Sin fit</option>{fits.map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}</select><span>También puedes escribir para buscar.</span></label>
            <label className="admin-field">Descripción corta<input value={shortDescription} maxLength={500} onChange={(event) => setShortDescription(event.currentTarget.value)} /></label>
            <label className="admin-field">Descripción<textarea rows={5} value={description} maxLength={5000} onChange={(event) => setDescription(event.currentTarget.value)} /></label>
          </div>
        </section>

        <section className="admin-form-section admin-product-details">
          <h2>Detalles</h2>
          <div className="admin-product-details-stack">
            <div className="admin-choice-section">
            <div className="admin-choice-heading"><h3>Colores</h3><button type="button" className="text-link" onClick={addColorRow} disabled={selectedColorIds.length >= colors.length}><Plus size={13} /> AÑADIR COLOR</button></div>
            {colorRows.length ? <div className="admin-color-rows">{colorRows.map((colorId, index) => {
              const unavailableIds = new Set(colorRows.filter((value, rowIndex) => rowIndex !== index && value));
              return <div className="admin-color-row" key={`color-${index}`}>
                {colorId && colorOptions.get(colorId)?.hex_color && <span className="admin-color-swatch" style={{ backgroundColor: colorOptions.get(colorId)?.hex_color ?? undefined }} aria-hidden="true" />}
                <select aria-label={`Color ${index + 1}`} value={colorId} onChange={(event) => requestChangeColor(index, event.currentTarget.value)}>
                  <option value="">Selecciona un color</option>
                  {colors.filter((color) => !unavailableIds.has(color.id)).map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
                <button type="button" aria-label="Quitar color" onClick={() => requestRemoveColor(index)}><Trash2 size={15} /></button>
              </div>;
            })}</div> : <p className="admin-choice-empty">Todavía no has añadido colores.</p>}
            {colors.length > 0 && <p className="admin-select-hint">En el selector puedes escribir el nombre del color y pulsar Enter.</p>}
            {!colors.length && <p className="admin-choice-empty">Primero registra colores desde la pestaña Colores.</p>}
            </div>
            <div className="admin-choice-section">
              <div className="admin-choice-heading"><h3>Tallas</h3><span>Selecciona todas las disponibles</span></div>
              {sizes.length ? <div className="admin-size-list">{sizes.map((size) => <label key={size.id} className={sizeIds.includes(size.id) ? "is-selected" : ""}>
              <input type="checkbox" checked={sizeIds.includes(size.id)} onChange={(event) => requestToggleSize(size, event.currentTarget.checked)} />
              <span>{size.name}</span>
            </label>)}</div> : <p className="admin-choice-empty">Primero registra tallas desde la pestaña Tallas.</p>}
            </div>
            <label className="admin-field">Material<input value={materialSummary} maxLength={160} placeholder="Algodón, denim…" onChange={(event) => setMaterialSummary(event.currentTarget.value)} /><span>Texto libre, igual que Cuidados. Opcional.</span></label>
            <label className="admin-field">Cuidados<textarea rows={3} value={care} onChange={(event) => setCare(event.currentTarget.value)} /></label>
            <label className="admin-featured-toggle"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.currentTarget.checked)} /><span><strong>Producto destacado</strong><small>Prioriza este producto en la portada.</small></span></label>
            <div className="admin-featured-toggle admin-switch-field">
              <button type="button" role="switch" aria-checked={published} aria-label="Cambiar estado de publicación" className={`admin-switch${published ? " is-on" : ""}`} onClick={() => setPublished((current) => !current)}><span /></button>
              <span><strong>{published ? "Producto publicado" : "Borrador"}</strong><small>{published ? "Visible en la tienda." : "Guardado pero no visible en la tienda."}</small></span>
            </div>
            {published && missingForPublish.length > 0 && <p className="admin-publish-hint" role="status">Para poder publicar falta: {missingForPublish.join(", ")}.</p>}
          </div>
      </section>
      </div>

      <section className="admin-form-section">
        <div className="admin-gallery-heading"><div><h2>Variantes, precio e inventario</h2><p>Las combinaciones se generan solas al elegir colores y tallas, y conservan los datos de las que ya existían.</p></div></div>
        {variants.length ? <div className="variant-table-wrap"><table className="variant-table"><thead><tr><th>Variante</th><th>SKU</th><th>Precio PEN</th><th>Stock</th><th>Activa</th></tr></thead><tbody>{variants.map((variant, index) => <tr key={variant.id}><td>{variant.variant_name || "—"}</td><td><input value={variant.sku} placeholder="SKU" onChange={(event) => updateVariant(index, { sku: event.currentTarget.value })} /></td><td><input aria-label={`Precio de ${variant.variant_name}`} type="number" min="0.01" step="0.01" value={variant.amount_cents ? variant.amount_cents / 100 : ""} onChange={(event) => updateVariant(index, { amount_cents: event.currentTarget.value ? Math.round(Number(event.currentTarget.value) * 100) : null })} /></td><td><input aria-label={`Stock de ${variant.variant_name}`} type="number" min="0" step="1" value={variant.quantity_on_hand} onChange={(event) => updateVariant(index, { quantity_on_hand: Math.max(0, Number(event.currentTarget.value)) })} /></td><td><input aria-label={`Variante activa ${variant.variant_name}`} type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(index, { is_active: event.currentTarget.checked })} /></td></tr>)}</tbody></table></div> : <p className="admin-gallery-empty">Selecciona colores y/o tallas y las combinaciones aparecerán aquí.</p>}
      </section>

      <section className="admin-form-section">
        <div className="admin-gallery-heading">
          <div>
            <h2>Galería del producto</h2>
            <p>Sube imágenes a la nube o selecciona existentes. Puedes asociar cada foto a un color específico o mostrarla para todos los colores.</p>
          </div>
          <span>{media.length} seleccionadas</span>
        </div>

        {uploadError && <p className="admin-alert" role="alert">{uploadError}</p>}

        <div className="admin-add-image" style={{ flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="outline-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
            {isUploading ? "SUBIENDO A LA NUBE…" : "SUBIR FOTO A LA NUBE"}
          </button>

          {assets.length > 0 && (
            <>
              <select
                aria-label="Seleccionar imagen local"
                value={selectedAsset}
                onChange={(event) => setSelectedAsset(event.currentTarget.value)}
              >
                <option value="">O elegir existente…</option>
                {assets
                  .filter((asset) => !media.some((item) => item.asset_path === asset))
                  .map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="outline-button"
                onClick={addMedia}
                disabled={!selectedAsset}
              >
                <Plus size={15} /> AÑADIR
              </button>
            </>
          )}
        </div>
        {media.length ? (
          <ol className="admin-gallery-list">
            {media.map((item, index) => (
              <li key={item.id}>
                <div className="admin-gallery-thumb">
                  <Image
                    src={item.asset_path}
                    alt=""
                    fill
                    sizes="58px"
                    quality={58}
                    unoptimized={item.asset_path.endsWith(".mp4") || item.asset_path.endsWith(".webm")}
                  />
                </div>
                <div className="admin-gallery-file">
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span title={item.asset_path}>{item.asset_path.split("/").pop()}</span>
                </div>
                <label className="admin-gallery-alt">
                  Alt
                  <input
                    value={item.alt_text}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setMedia((current) =>
                        current.map((mediaItem) =>
                          mediaItem.id === item.id ? { ...mediaItem, alt_text: value } : mediaItem
                        )
                      );
                    }}
                  />
                </label>
                <label className="admin-gallery-color">
                  <span style={{ fontSize: "9px", color: "#777", display: "block", marginBottom: "3px" }}>Color</span>
                  <select
                    aria-label={`Color para imagen ${index + 1}`}
                    value={item.color_id ?? ""}
                    onChange={(event) => {
                      const val = event.currentTarget.value || null;
                      setMedia((current) =>
                        current.map((mediaItem) =>
                          mediaItem.id === item.id ? { ...mediaItem, color_id: val } : mediaItem
                        )
                      );
                    }}
                    style={{ minHeight: "34px", padding: "6px", fontSize: "11px", border: "1px solid #dedbd6", background: "#fff" }}
                  >
                    <option value="">Todos los colores</option>
                    {selectedColorIds.map((cid) => (
                      <option key={cid} value={cid}>
                        Solo {colorNames.get(cid) ?? "Color"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-lifestyle">
                  <input
                    type="checkbox"
                    checked={item.is_lifestyle}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setMedia((current) =>
                        current.map((mediaItem) =>
                          mediaItem.id === item.id ? { ...mediaItem, is_lifestyle: checked } : mediaItem
                        )
                      );
                    }}
                  />{" "}
                  Lifestyle
                </label>
                <div className="admin-gallery-actions">
                  <button
                    type="button"
                    aria-label="Subir imagen"
                    disabled={index === 0}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next.map((mediaItem, position) => ({ ...mediaItem, position }));
                      })
                    }
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar imagen"
                    disabled={index === media.length - 1}
                    onClick={() =>
                      setMedia((current) => {
                        const next = [...current];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        return next.map((mediaItem, position) => ({ ...mediaItem, position }));
                      })
                    }
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Quitar imagen"
                    onClick={() =>
                      setMedia((current) =>
                        current
                          .filter((mediaItem) => mediaItem.id !== item.id)
                          .map((mediaItem, position) => ({ ...mediaItem, position }))
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="admin-gallery-empty">Este producto todavía no tiene imágenes.</p>
        )}
      </section>

      <div className="admin-form-footer">
        <a className="outline-button" href="/admin/products">CANCELAR</a>
        <button className="dark-button" type="submit" disabled={pending}>{pending ? "GUARDANDO…" : published ? (product.status === "published" ? "GUARDAR CAMBIOS" : "GUARDAR Y PUBLICAR") : "GUARDAR BORRADOR"}</button>
      </div>

      {removalRequest && <VariantRemovalDialog
        title={`Quitar ${removalRequest.kind === "color" ? "color" : "talla"}: ${removalRequest.label}`}
        copy={`Al quitar ${removalRequest.label} se eliminarán las variantes que lo usan. El borrado se hace definitivo al guardar el producto.`}
        affected={removalRequest.affected}
        confirmLabel="QUITAR"
        onCancel={() => setRemovalRequest(null)}
        onConfirm={() => { removalRequest.apply(); setRemovalRequest(null); }}
      />}
      {saveDialogOpen && <VariantRemovalDialog
        title="Confirmar eliminación de variantes"
        copy="Quitaste colores o tallas que el producto tenía guardados. Al guardar, estas variantes se eliminarán definitivamente."
        affected={toImpacts(removedVariants)}
        confirmLabel="ELIMINAR Y GUARDAR"
        onCancel={() => setSaveDialogOpen(false)}
        onConfirm={() => { setSaveDialogOpen(false); setSaveRemovalConfirmed(true); }}
      />}
    </form>
  );
}

function VariantRemovalDialog({
  title,
  copy,
  affected,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  copy: string;
  affected: VariantImpact[];
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="admin-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-dialog-heading"><div><span className="eyebrow">VARIANTES AFECTADAS</span><h2>{title}</h2></div><button type="button" className="admin-dialog-close" aria-label="Cerrar" onClick={onCancel}><X size={18} /></button></div>
        <p className="admin-dialog-copy">{copy}</p>
        <p className="admin-dialog-subtitle">Se eliminarán {affected.length} {affected.length === 1 ? "variante" : "variantes"}</p>
        <ul className="admin-related-products">
          {affected.map((variant) => <li key={variant.id}>
            <span className="admin-variant-impact-name">{variant.name}</span>
            <span>{[variant.sku.trim() || "Sin SKU", variant.amount_cents ? `S/ ${(variant.amount_cents / 100).toFixed(2)}` : "Sin precio", `Stock ${variant.quantity_on_hand}`].join(" · ")}</span>
          </li>)}
        </ul>
        <div className="admin-dialog-actions"><button type="button" className="outline-button" onClick={onCancel}>CANCELAR</button><button type="button" className="dark-button" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  );
}
