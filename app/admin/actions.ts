"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getImageAssetPaths } from "@/lib/catalog/products";
import { createSupabaseServerClient, getActiveAdmin } from "@/lib/supabase/server";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const catalogValueTables = ["colors", "sizes", "fits"] as const;
type CatalogValueTable = (typeof catalogValueTables)[number];

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Escribe el nombre del producto.").max(180),
  slug: z.string().trim().regex(slugPattern, "Usa minúsculas, números y guiones en el slug."),
  description: z.string().trim().max(5000).nullable(),
  short_description: z.string().trim().max(500).nullable(),
  subcategory_id: z.string().uuid().nullable(),
  fit_id: z.string().uuid().nullable(),
  material_summary: z.string().trim().max(160).nullable(),
  care_instructions: z.string().trim().max(1000).nullable(),
  status: z.enum(["draft", "published"]),
  is_featured: z.boolean(),
});

function hasPublishableVariant(variants: unknown[]) {
  return variants.some((variant) => {
    if (!variant || typeof variant !== "object") return false;
    const item = variant as Record<string, unknown>;
    const prices = Array.isArray(item.prices) ? item.prices : [];
    return item.is_active === true
      && String(item.sku ?? "").trim().length > 0
      && prices.some((price) => {
        if (!price || typeof price !== "object") return false;
        const value = price as Record<string, unknown>;
        return value.is_active !== false
          && z.string().uuid().safeParse(value.price_list_id).success
          && Number.isInteger(value.amount_cents)
          && Number(value.amount_cents) > 0;
      });
  });
}

function catalogSaveError(error: { code?: string; message?: string }) {
  if (error.code === "23505" && error.message?.toLowerCase().includes("sku")) {
    return "Ese SKU ya está asignado a otra variante. Usa un SKU distinto.";
  }
  if (error.code === "23503" && error.message?.includes("VARIANT_OPTION_VALUE_MISMATCH")) {
    return "Una variante usa un valor de opción que ya no pertenece al producto. Genera nuevamente las combinaciones.";
  }
  if (error.code === "23503" && /VARIANT_(COLOR|SIZE)_NOT_SELECTED/.test(error.message ?? "")) {
    return "Una variante usa un color o talla que no está seleccionado para este producto.";
  }
  if (error.code === "23514" && error.message?.includes("PRODUCT_REQUIRES_SUBCATEGORY")) {
    return "Selecciona una subcategoría que pertenezca a una categoría principal.";
  }
  if (error.code === "23514" && error.message?.includes("PUBLISH_REQUIRES_SUBCATEGORY")) {
    return "Para publicar, asigna una subcategoría al producto.";
  }
  if (error.code === "23514" && error.message?.includes("PUBLISH_REQUIRES_COLORS")) {
    return "Para publicar, el producto necesita al menos un color.";
  }
  if (error.code === "23514" && error.message?.includes("PUBLISH_REQUIRES_SIZES")) {
    return "Para publicar, el producto necesita al menos una talla.";
  }
  if (error.code === "23514" && error.message?.includes("PUBLISH_REQUIRES_MEDIA")) {
    return "Para publicar, añade al menos una imagen al producto.";
  }
  if (error.code === "23514" && error.message?.includes("PUBLISH_REQUIRES_VARIANT")) {
    return "Para publicar necesitas al menos una variante activa con SKU y precio asociado a una lista vigente.";
  }
  if (error.code === "23503" && error.message?.toLowerCase().includes("inventory_movements")) {
    return "No se pudieron eliminar algunas variantes porque tienen movimientos de inventario registrados.";
  }
  if (error.code === "22P02") {
    return "No se pudo guardar porque falta una lista de precios o un almacén válido. Revisa la configuración del catálogo.";
  }
  return `No se pudo guardar el catálogo: ${error.message ?? "error desconocido"}`;
}

export type ProductActionState = { error?: string; success?: boolean };

export async function signInAction(formData: FormData): Promise<never> {
  const credentials = z.object({ email: z.email(), password: z.string().min(1).max(200) }).safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!credentials.success) redirect("/admin/login?error=credentials");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin/login?error=not-configured");
  const { error } = await supabase.auth.signInWithPassword(credentials.data);
  if (error) redirect("/admin/login?error=credentials");
  const { data: authData } = await supabase.auth.getUser();
  const { data: profile } = authData.user
    ? await supabase.from("admin_profiles").select("role, is_active").eq("user_id", authData.user.id).maybeSingle()
    : { data: null };
  if (!profile?.is_active || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=unauthorized");
  }
  redirect("/admin/products");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

export async function saveProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "Tu sesión no tiene permiso para guardar productos." };

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(String(formData.get("catalogJson") ?? "{}"));
  } catch {
    return { error: "El formulario no tiene un formato válido." };
  }
  const requestedStatus = payload.status === "published" ? "published" : "draft";
  const parsed = productSchema.safeParse({
    ...payload,
    id: String(payload.id || randomUUID()),
    description: String(payload.description ?? "").trim() || null,
    short_description: String(payload.short_description ?? "").trim() || null,
    subcategory_id: payload.subcategory_id || null,
    fit_id: payload.fit_id || null,
    material_summary: String(payload.material_summary ?? "").trim() || null,
    care_instructions: String(payload.care_instructions ?? "").trim() || null,
    status: requestedStatus,
    is_featured: Boolean(payload.is_featured),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del producto." };

  const colorIds = Array.isArray(payload.color_ids) ? payload.color_ids : [];
  const sizeIds = Array.isArray(payload.size_ids) ? payload.size_ids : [];
  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const media = Array.isArray(payload.media) ? payload.media : [];
  if ([...colorIds, ...sizeIds].some((id) => !z.string().uuid().safeParse(id).success)) {
    return { error: "Revisa los colores y tallas seleccionados." };
  }
  if (new Set(colorIds).size !== colorIds.length || new Set(sizeIds).size !== sizeIds.length) {
    return { error: "No repitas colores ni tallas en el producto." };
  }
  const availablePaths = new Set(getImageAssetPaths());
  if (media.some((item) => {
    if (!item || typeof item !== "object") return true;
    const path = String((item as Record<string, unknown>).asset_path ?? "");
    if (path.startsWith("http://") || path.startsWith("https://")) return false;
    return !availablePaths.has(path);
  })) {
    return { error: "Una de las imágenes seleccionadas no existe en el catálogo de archivos." };
  }
  if (parsed.data.status === "published") {
    if (!parsed.data.subcategory_id) {
      return { error: "Para publicar, asigna una subcategoría al producto." };
    }
    if (!colorIds.length) {
      return { error: "Para publicar, el producto necesita al menos un color." };
    }
    if (!sizeIds.length) {
      return { error: "Para publicar, el producto necesita al menos una talla." };
    }
    if (!media.length) {
      return { error: "Para publicar, añade al menos una imagen al producto." };
    }
    if (!hasPublishableVariant(variants)) {
      return { error: "Para publicar necesitas al menos una variante activa con SKU y precio asociado a una lista vigente." };
    }
  }
  const combinationKeys = new Set<string>();
  if (variants.some((item) => {
    if (!item || typeof item !== "object") return true;
    const variant = item as Record<string, unknown>;
    const invalid = !z.string().uuid().safeParse(variant.id).success
      || (variant.color_id !== null && !z.string().uuid().safeParse(variant.color_id).success)
      || (variant.size_id !== null && !z.string().uuid().safeParse(variant.size_id).success)
      || (variant.color_id !== null && !colorIds.includes(variant.color_id))
      || (variant.size_id !== null && !sizeIds.includes(variant.size_id));
    if (invalid) return true;
    const key = `${String(variant.color_id ?? "")}::${String(variant.size_id ?? "")}`;
    if (combinationKeys.has(key)) return true;
    combinationKeys.add(key);
    return false;
  })) return { error: "Revisa las combinaciones de color y talla." };

  const { error } = await supabase.rpc("save_catalog_product", {
    p_payload: {
      ...parsed.data,
      gender: "female",
      color_ids: colorIds,
      size_ids: sizeIds,
      variants,
      media,
    },
  });
  if (error) return { error: catalogSaveError(error) };

  revalidatePath("/");
  revalidatePath(`/products/${parsed.data.slug}`);
  revalidateTag("catalog");
  revalidateTag(`product:${parsed.data.slug}`);
  revalidatePath("/admin/products");
  return { success: true };
}

export async function setProductStatusAction(formData: FormData): Promise<never> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) redirect("/admin/login?error=unauthorized");
  const id = String(formData.get("id") ?? "");
  const status = z.enum(["draft", "published", "archived"]).safeParse(String(formData.get("status") ?? ""));
  if (!z.string().uuid().safeParse(id).success || !status.success) redirect("/admin/products?error=invalid");
  if (status.data === "published") {
    const [productResult, colorsResult, sizesResult, mediaResult, variantsResult] = await Promise.all([
      supabase.from("products").select("subcategory_id").eq("id", id).maybeSingle(),
      supabase.from("product_colors").select("color_id", { count: "exact", head: true }).eq("product_id", id),
      supabase.from("product_sizes").select("size_id", { count: "exact", head: true }).eq("product_id", id),
      supabase.from("product_media").select("id", { count: "exact", head: true }).eq("product_id", id),
      supabase
        .from("product_variants")
        .select("sku, is_active, variant_prices(amount_cents, is_active, price_list_id)")
        .eq("product_id", id),
    ]);
    if (productResult.error || !productResult.data?.subcategory_id) redirect("/admin/products?error=subcategory");
    if (colorsResult.error || !colorsResult.count) redirect("/admin/products?error=colors");
    if (sizesResult.error || !sizesResult.count) redirect("/admin/products?error=sizes");
    if (mediaResult.error || !mediaResult.count) redirect("/admin/products?error=media");
    if (variantsResult.error || !hasPublishableVariant((variantsResult.data ?? []).map((variant: any) => ({
      ...variant,
      prices: variant.variant_prices,
    })))) redirect("/admin/products?error=variant");
  }
  const { error } = await supabase.from("products").update({ status: status.data }).eq("id", id);
  if (error) redirect("/admin/products?error=save");
  revalidatePath("/");
  revalidateTag("catalog");
  revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function saveCategoryAction(formData: FormData): Promise<never> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) redirect("/admin/login?error=unauthorized");
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const slug = makeSlug(name);
  if (name.length < 1 || name.length > 120 || !slugPattern.test(slug)) redirect("/admin/categories?error=invalid");
  if (parentId) {
    if (!z.string().uuid().safeParse(parentId).success) redirect("/admin/categories?error=invalid");
    const { data: parent, error: parentError } = await supabase.from("categories").select("id, parent_id").eq("id", parentId).maybeSingle();
    if (parentError || !parent || parent.parent_id) redirect("/admin/categories?error=parent");
  }
  let categoryCount = supabase.from("categories").select("id", { count: "exact", head: true });
  categoryCount = parentId ? categoryCount.eq("parent_id", parentId) : categoryCount.is("parent_id", null);
  const { count } = await categoryCount;
  const { error } = await supabase.from("categories").insert({
    id: randomUUID(), name, slug, parent_id: parentId, description,
    is_active: true, sort_order: count ?? 0,
  });
  if (error) redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products/new");
  revalidateTag("catalog");
  redirect(`/admin/categories?saved=${Date.now()}`);
}

export async function saveCatalogValueAction(formData: FormData): Promise<never> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) redirect("/admin/login?error=unauthorized");

  const table = String(formData.get("table") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const hexColor = String(formData.get("hex_color") ?? "").trim() || null;
  if (!catalogValueTables.includes(table as CatalogValueTable)) redirect("/admin?error=invalid");
  const valueTable = table as CatalogValueTable;
  const nameMax = valueTable === "sizes" ? 40 : 100;
  const slug = makeSlug(name);
  if (!name || name.length > nameMax || !slugPattern.test(slug)) redirect(`/admin/${valueTable}?error=invalid`);
  if (valueTable === "colors" && hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    redirect(`/admin/${valueTable}?error=invalid`);
  }

  const { count } = await supabase.from(valueTable).select("id", { count: "exact", head: true });
  const record = {
    id: randomUUID(), name, slug, sort_order: count ?? 0, is_active: true,
    ...(valueTable === "colors" ? { hex_color: hexColor } : {}),
  };
  const { error } = await (supabase.from(valueTable) as any).insert(record);
  if (error) redirect(`/admin/${valueTable}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/admin/${valueTable}`);
  revalidatePath("/admin/products/new");
  revalidatePath("/admin/categories");
  revalidateTag("catalog");
  redirect(`/admin/${valueTable}?saved=${Date.now()}`);
}

export type CatalogAdminActionState = { error?: string; success?: boolean; affectedProducts?: number };

const manageableCatalogTables = [...catalogValueTables, "categories"] as const;
type ManageableCatalogTable = (typeof manageableCatalogTables)[number];

export async function updateCatalogValueAction(
  _previousState: CatalogAdminActionState,
  formData: FormData,
): Promise<CatalogAdminActionState> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "Tu sesión no tiene permiso para editar el catálogo." };

  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const hexColor = String(formData.get("hex_color") ?? "").trim() || null;
  if (!manageableCatalogTables.includes(table as ManageableCatalogTable) || !z.string().uuid().safeParse(id).success) {
    return { error: "No se pudo identificar el valor que quieres editar." };
  }
  const valueTable = table as ManageableCatalogTable;
  const nameMax = valueTable === "sizes" ? 40 : valueTable === "categories" ? 120 : 100;
  const slug = makeSlug(name);
  if (!name || name.length > nameMax || !slugPattern.test(slug)) return { error: "Revisa el nombre del valor." };
  if (valueTable === "colors" && hexColor && !/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return { error: "Elige un color hexadecimal válido." };
  }
  if (valueTable === "categories" && (description?.length ?? 0) > 1000) {
    return { error: "La descripción no puede superar los 1000 caracteres." };
  }

  const changes = {
    name,
    slug,
    ...(valueTable === "colors" ? { hex_color: hexColor } : {}),
    ...(valueTable === "categories" ? { description } : {}),
  };
  const { data, error } = await (supabase.from(valueTable) as any)
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error?.code === "23505") return { error: "Ya existe un valor con ese nombre." };
    return { error: "No se pudo actualizar el valor. Inténtalo de nuevo." };
  }

  revalidatePath(`/admin/${valueTable}`);
  revalidatePath("/admin/products");
  revalidateTag("catalog");
  return { success: true };
}

export async function deleteCatalogValueAction(
  _previousState: CatalogAdminActionState,
  formData: FormData,
): Promise<CatalogAdminActionState> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "Tu sesión no tiene permiso para cambiar el catálogo." };

  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!manageableCatalogTables.includes(table as ManageableCatalogTable)
    || !z.string().uuid().safeParse(id).success) {
    return { error: "No se pudo identificar el valor que quieres eliminar." };
  }

  const valueTable = table as ManageableCatalogTable;
  const { data, error } = await supabase.rpc("delete_catalog_value", {
    p_kind: valueTable,
    p_value_id: id,
  });
  if (error) {
    if (error.code === "P0002") return { error: "El valor ya no existe en el catálogo. Actualiza la página." };
    if (error.code === "23503" && error.message?.toLowerCase().includes("inventory_movements")) {
      return { error: "No se pudo eliminar porque hay variantes con movimientos de inventario registrados." };
    }
    return { error: "No se pudo eliminar el valor. Inténtalo de nuevo." };
  }

  revalidatePath(`/admin/${valueTable}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/");
  revalidateTag("catalog");
  return { success: true, affectedProducts: Number(data ?? 0) };
}

export type UploadMediaResult = {
  success?: boolean;
  error?: string;
  publicUrl?: string;
  filePath?: string;
  fileName?: string;
};

export async function uploadMediaAction(formData: FormData): Promise<UploadMediaResult> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "Tu sesión no tiene permisos de administrador." };

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "No se proporcionó ningún archivo válido." };
  }

  const folder = String(formData.get("folder") ?? "products").trim().replace(/[^a-z0-9_-]/gi, "");
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"];
  if (!allowedMime.includes(file.type)) {
    return { error: "Formato no permitido. Solo se aceptan imágenes (JPG, PNG, WebP, AVIF) y videos (MP4, WebM)." };
  }

  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxBytes) {
    return { error: "El archivo supera el límite de 10 MB." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");
  const uniquePrefix = `${Date.now()}-${randomUUID().slice(0, 6)}`;
  const filePath = `${folder}/${uniquePrefix}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("catalog-media").upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { error: `Error al subir archivo a Storage: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage.from("catalog-media").getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  await supabase.from("media_assets").insert({
    bucket_id: "catalog-media",
    file_path: filePath,
    public_url: publicUrl,
    file_name: file.name,
    content_type: file.type,
    file_size_bytes: file.size,
  });

  revalidatePath("/admin/media");
  return {
    success: true,
    publicUrl,
    filePath,
    fileName: file.name,
  };
}

export async function deleteMediaAssetAction(id: string, filePath: string): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "No autorizado." };

  if (filePath) {
    await supabase.storage.from("catalog-media").remove([filePath]);
  }
  if (id) {
    await supabase.from("media_assets").delete().eq("id", id);
  }

  revalidatePath("/admin/media");
  return { success: true };
}

export async function saveHomeSlideAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "No autorizado." };

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim() || null;
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const media_url = String(formData.get("media_url") ?? "").trim();
  const media_type = (String(formData.get("media_type") ?? "image") as "image" | "video") || "image";
  const button_label = String(formData.get("button_label") ?? "").trim() || null;
  const href = String(formData.get("href") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  if (!media_url) return { error: "Debes asignar una imagen o video al slide." };

  const payload = {
    title,
    subtitle,
    media_url,
    media_type,
    button_label,
    href,
    sort_order,
    is_active,
  };

  if (id) {
    const { error } = await supabase.from("home_slides").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("home_slides").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/home");
  return { success: true };
}

export async function deleteHomeSlideAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "No autorizado." };

  const { error } = await supabase.from("home_slides").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/home");
  return { success: true };
}

export async function saveHomeBannerAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "No autorizado." };

  const identifier = String(formData.get("identifier") ?? "main_promo").trim();
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const button_label = String(formData.get("button_label") ?? "Comprar ahora").trim();
  const href = String(formData.get("href") ?? "#productos").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  if (!title || !image_url) return { error: "El banner requiere al menos título e imagen." };

  const { error } = await supabase.from("home_banners").upsert({
    identifier,
    title,
    subtitle,
    button_label,
    href,
    image_url,
    is_active,
  }, { onConflict: "identifier" });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/home");
  return { success: true };
}

