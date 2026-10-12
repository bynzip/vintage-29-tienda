"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { saveCategoryAction } from "@/app/admin/actions";
import CatalogValueTable, { type ManagedCatalogValue } from "@/components/admin/CatalogValueTable";
import { useAdminUserId } from "@/components/admin/AdminClientProvider";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Category = ManagedCatalogValue & { parent_id: string | null; description: string | null };

export default function AdminCategoriesClient({ saved, error }: { saved?: string; error?: string }) {
  const userId = useAdminUserId();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const cacheKey = `admin:${userId}:categories:${refreshVersion}`;
  const loadCategories = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("No se pudo iniciar la conexión con el catálogo.");

    const { data, error: requestError } = await supabase
      .from("categories")
      .select("id, name, parent_id, description, is_active, sort_order")
      .order("sort_order")
      .order("name");
    if (requestError) throw new Error(requestError.message);
    const categories = (data ?? []) as Category[];
    const names = new Map(categories.map((category) => [category.id, category.name]));
    return categories.map((category) => ({
      ...category,
      parent_name: category.parent_id ? names.get(category.parent_id) ?? "Categoría" : null,
    }));
  }, []);

  const { data, loading, error: loadError } = useAdminQuery(cacheKey, loadCategories, {
    invalidatePrefix: `admin:${userId}:`,
    refreshToken: saved,
  });
  const categories = data ?? [];
  const parents = categories.filter((category) => !category.parent_id && category.is_active);
  const handleChanged = useCallback((message: string) => {
    setNotice(message);
    setRefreshVersion((current) => current + 1);
  }, []);

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="eyebrow">TAXONOMÍA</span><h1>Categorías</h1><p>Organiza el catálogo en categorías principales y subcategorías.</p></div><Link href="/admin/products/new" className="outline-button">IR A PRODUCTOS</Link></div>
      {(saved || notice) && <p className="admin-success" role="status">{notice || "Categoría guardada."}</p>}
      {error && <p className="admin-alert" role="alert">{error === "parent" ? "Elige una categoría principal para crear una subcategoría." : error === "update" ? "No se pudo actualizar la categoría." : "No se pudo guardar la categoría. Revisa que el nombre no esté repetido."}</p>}
      {loadError && <p className="admin-alert" role="alert">No se pudieron cargar las categorías: {loadError}</p>}
      <div className="admin-form-grid admin-category-forms">
        <section className="admin-form-section">
          <h2>Nueva categoría</h2>
          <form action={saveCategoryAction} className="admin-form-grid">
            <input type="hidden" name="parent_id" value="" />
            <label className="admin-field admin-field-wide">Nombre<input name="name" required maxLength={120} placeholder="Ropa" /></label>
            <label className="admin-field admin-field-wide">Descripción<textarea name="description" rows={2} maxLength={1000} /></label>
            <button className="dark-button" type="submit">GUARDAR CATEGORÍA</button>
          </form>
        </section>
        <section className="admin-form-section">
          <h2>Nueva subcategoría</h2>
          <form action={saveCategoryAction} className="admin-form-grid">
            <label className="admin-field admin-field-wide">Categoría principal<select name="parent_id" required defaultValue=""><option value="" disabled>Selecciona una categoría</option>{parents.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="admin-field admin-field-wide">Nombre de subcategoría<input name="name" required maxLength={120} placeholder="Pantalones" /></label>
            <label className="admin-field admin-field-wide">Descripción<textarea name="description" rows={2} maxLength={1000} /></label>
            <button className="dark-button" type="submit" disabled={!parents.length}>GUARDAR SUBCATEGORÍA</button>
          </form>
        </section>
      </div>
      <section className="admin-form-section">
        <h2>Categorías y subcategorías existentes</h2>
        {loading && !data ? <p className="catalog-status" role="status">Cargando categorías…</p> : categories.length ? (
          <CatalogValueTable kind="categories" values={categories} onChanged={handleChanged} />
        ) : <p className="admin-gallery-empty">Aún no hay categorías. Crea una categoría principal para comenzar.</p>}
      </section>
    </main>
  );
}
