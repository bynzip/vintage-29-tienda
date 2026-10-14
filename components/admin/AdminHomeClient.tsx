"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  saveHomeSlideAction,
  deleteHomeSlideAction,
  saveHomeBannerAction,
  uploadMediaAction,
} from "@/app/admin/actions";
import type { HomeSlideRow, HomeBannerRow } from "@/lib/supabase/database.types";

export default function AdminHomeClient() {
  const [slides, setSlides] = useState<HomeSlideRow[]>([]);
  const [banner, setBanner] = useState<HomeBannerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New slide form state
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Partial<HomeSlideRow> | null>(null);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  // Banner upload state
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("No se pudo conectar con Supabase.");
      setLoading(false);
      return;
    }

    const [slidesRes, bannerRes] = await Promise.all([
      supabase.from("home_slides").select("*").order("sort_order", { ascending: true }),
      supabase.from("home_banners").select("*").eq("identifier", "main_promo").maybeSingle(),
    ]);

    if (slidesRes.data) setSlides(slidesRes.data);
    if (bannerRes.data) setBanner(bannerRes.data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function notify(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // --- Slide Handlers ---
  async function handleSlideFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingSlide(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "home");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setError(res.error || "No se pudo subir el archivo.");
      } else {
        setEditingSlide((prev) => ({
          ...prev,
          media_url: res.publicUrl,
          media_type: file.type.startsWith("video") ? "video" : "image",
        }));
      }
    } finally {
      setUploadingSlide(false);
      if (slideFileInputRef.current) slideFileInputRef.current.value = "";
    }
  }

  async function handleSaveSlide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const res = await saveHomeSlideAction(formData);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Slide guardado correctamente.");
      setShowSlideForm(false);
      setEditingSlide(null);
      loadData();
    }
  }

  async function handleDeleteSlide(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este slide de la portada?")) return;
    const res = await deleteHomeSlideAction(id);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Slide eliminado.");
      loadData();
    }
  }

  async function moveSlide(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const currentSlide = slides[index];
    const targetSlide = slides[targetIndex];

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    await Promise.all([
      supabase.from("home_slides").update({ sort_order: targetSlide.sort_order }).eq("id", currentSlide.id),
      supabase.from("home_slides").update({ sort_order: currentSlide.sort_order }).eq("id", targetSlide.id),
    ]);
    loadData();
  }

  // --- Banner Handlers ---
  async function handleBannerFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "home");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setError(res.error || "Error al subir la imagen del banner.");
      } else {
        setBanner((prev) => (prev ? { ...prev, image_url: res.publicUrl! } : null));
      }
    } finally {
      setUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
    }
  }

  async function handleSaveBanner(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const res = await saveHomeBannerAction(formData);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Banner promocional guardado correctamente.");
      loadData();
    }
  }

  if (loading) {
    return <div className="admin-loading"><p>Cargando configuración de portada…</p></div>;
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">PORTADA Y LANDING</span>
          <h1>Configuración del Inicio</h1>
          <p>Administra los slides del carrusel principal y el banner promocional de la tienda.</p>
        </div>
      </div>

      {error && (
        <p className="admin-alert" role="alert" style={{ marginBottom: "16px" }}>
          {error}
          <button type="button" onClick={() => setError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </p>
      )}

      {successMessage && (
        <p className="admin-banner-success" style={{ padding: "10px 14px", background: "#eef8f1", color: "#1e6b37", fontSize: "12px", border: "1px solid #c2e9cd", marginBottom: "16px" }}>
          {successMessage}
        </p>
      )}

      {/* SECCIÓN 1: CARRUSEL DE PORTADA (HERO CAROUSEL) */}
      <section className="admin-form-section" style={{ marginBottom: "28px" }}>
        <div className="admin-gallery-heading">
          <div>
            <h2>Carrusel Principal (Hero Carousel)</h2>
            <p>Imágenes y videos a pantalla completa en la portada. Puedes añadir títulos, cambiar el orden y definir el link del botón.</p>
          </div>
          <button
            type="button"
            className="dark-button"
            onClick={() => {
              setEditingSlide({
                media_url: "",
                media_type: "image",
                title: "",
                subtitle: "",
                button_label: "Descubrir",
                href: "#productos",
                sort_order: slides.length + 1,
                is_active: true,
              });
              setShowSlideForm(true);
            }}
          >
            <Plus size={14} /> AÑADIR SLIDE
          </button>
        </div>

        {/* Formulario Modal / Colapsable para Slide */}
        {showSlideForm && editingSlide && (
          <form onSubmit={handleSaveSlide} className="admin-card-box" style={{ padding: "18px", border: "1px solid var(--ink)", background: "#faf9f7", marginBottom: "20px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "13px", fontWeight: 600 }}>
              {editingSlide.id ? "Editar Slide" : "Nuevo Slide de Portada"}
            </h3>

            {editingSlide.id && <input type="hidden" name="id" value={editingSlide.id} />}
            <input type="hidden" name="sort_order" value={editingSlide.sort_order ?? slides.length + 1} />
            <input type="hidden" name="media_type" value={editingSlide.media_type ?? "image"} />

            <div className="admin-form-stack" style={{ gap: "12px" }}>
              <div className="admin-field">
                <label>Archivo Multimedia (Imagen o Video) *</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    name="media_url"
                    value={editingSlide.media_url ?? ""}
                    required
                    placeholder="URL pública de la imagen o video"
                    onChange={(e) => setEditingSlide({ ...editingSlide, media_url: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <input
                    ref={slideFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleSlideFileUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => slideFileInputRef.current?.click()}
                    disabled={uploadingSlide}
                  >
                    {uploadingSlide ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    {uploadingSlide ? "SUBIENDO…" : "SUBIR"}
                  </button>
                </div>
              </div>

              {editingSlide.media_url && (
                <div style={{ position: "relative", width: "120px", height: "70px", overflow: "hidden", border: "1px solid #ddd" }}>
                  <Image src={editingSlide.media_url} alt="" fill sizes="120px" quality={50} style={{ objectFit: "cover" }} />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="admin-field">
                  Título (opcional)
                  <input
                    name="title"
                    value={editingSlide.title ?? ""}
                    placeholder="Ej. Nueva Temporada"
                    onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  Subtítulo (opcional)
                  <input
                    name="subtitle"
                    value={editingSlide.subtitle ?? ""}
                    placeholder="Ej. Vintage 29"
                    onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="admin-field">
                  Texto del Botón
                  <input
                    name="button_label"
                    value={editingSlide.button_label ?? ""}
                    placeholder="Ej. Comprar ahora"
                    onChange={(e) => setEditingSlide({ ...editingSlide, button_label: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  Link de Redirección (href)
                  <input
                    name="href"
                    value={editingSlide.href ?? ""}
                    placeholder="Ej. #productos o /products/cadera-pant-alana"
                    onChange={(e) => setEditingSlide({ ...editingSlide, href: e.target.value })}
                  />
                </label>
              </div>

              <label className="admin-lifestyle">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  checked={editingSlide.is_active ?? true}
                  onChange={(e) => setEditingSlide({ ...editingSlide, is_active: e.target.checked })}
                />
                {" "}Slide activo y visible
              </label>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button type="button" className="outline-button" onClick={() => { setShowSlideForm(false); setEditingSlide(null); }}>
                  CANCELAR
                </button>
                <button type="submit" className="dark-button">
                  GUARDAR SLIDE
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Lista de Slides */}
        {slides.length > 0 ? (
          <div className="admin-gallery-list" style={{ gap: "10px" }}>
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "70px 1.5fr 1fr auto auto",
                  alignItems: "center",
                  gap: "14px",
                  padding: "10px 14px",
                  border: "1px solid var(--line)",
                  background: slide.is_active ? "#fff" : "#f6f5f3",
                  opacity: slide.is_active ? 1 : 0.6,
                }}
              >
                <div style={{ position: "relative", width: "70px", height: "45px", background: "#eee", overflow: "hidden" }}>
                  <Image src={slide.media_url} alt="" fill sizes="70px" quality={50} style={{ objectFit: "cover" }} />
                </div>
                <div>
                  <strong style={{ fontSize: "11px", display: "block" }}>{slide.title || "Sin título"}</strong>
                  <span style={{ fontSize: "10px", color: "#666" }}>{slide.subtitle || "Sin subtítulo"}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                  <span>Botón: <strong>{slide.button_label || "Ninguno"}</strong></span>
                  <span style={{ display: "block" }}>Link: {slide.href || "Ninguno"}</span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    aria-label="Subir"
                    disabled={index === 0}
                    onClick={() => moveSlide(index, "up")}
                    className="outline-button"
                    style={{ padding: "4px 6px" }}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Bajar"
                    disabled={index === slides.length - 1}
                    onClick={() => moveSlide(index, "down")}
                    className="outline-button"
                    style={{ padding: "4px 6px" }}
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="outline-button"
                    style={{ fontSize: "10px", padding: "4px 8px" }}
                    onClick={() => {
                      setEditingSlide(slide);
                      setShowSlideForm(true);
                    }}
                  >
                    EDITAR
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar"
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="outline-button"
                    style={{ padding: "4px 8px", color: "#a00" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-gallery-empty">No hay slides configurados. Añade uno con el botón superior.</p>
        )}
      </section>

      {/* SECCIÓN 2: BANNER PROMOCIONAL INFERIOR */}
      <section className="admin-form-section">
        <div className="admin-gallery-heading">
          <div>
            <h2>Banner Promocional</h2>
            <p>Banner destacado que aparece después del catálogo de productos en la página principal.</p>
          </div>
        </div>

        {banner && (
          <form onSubmit={handleSaveBanner} className="admin-form-stack" style={{ gap: "14px", maxWidth: "600px" }}>
            <input type="hidden" name="identifier" value="main_promo" />

            <div className="admin-field">
              <label>Imagen del Banner *</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  name="image_url"
                  value={banner.image_url}
                  required
                  onChange={(e) => setBanner({ ...banner, image_url: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={uploadingBanner}
                >
                  {uploadingBanner ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  {uploadingBanner ? "SUBIENDO…" : "CAMBIAR FOTO"}
                </button>
              </div>
            </div>

            {banner.image_url && (
              <div style={{ position: "relative", width: "100%", height: "120px", overflow: "hidden", border: "1px solid #ddd" }}>
                <Image src={banner.image_url} alt="" fill sizes="500px" quality={60} style={{ objectFit: "cover" }} />
              </div>
            )}

            <label className="admin-field">
              Título del Banner
              <input
                name="title"
                value={banner.title}
                required
                onChange={(e) => setBanner({ ...banner, title: e.target.value })}
              />
            </label>

            <label className="admin-field">
              Subtítulo
              <input
                name="subtitle"
                value={banner.subtitle ?? ""}
                onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label className="admin-field">
                Texto del Botón
                <input
                  name="button_label"
                  value={banner.button_label}
                  required
                  onChange={(e) => setBanner({ ...banner, button_label: e.target.value })}
                />
              </label>
              <label className="admin-field">
                Enlace de Redirección (href)
                <input
                  name="href"
                  value={banner.href}
                  required
                  onChange={(e) => setBanner({ ...banner, href: e.target.value })}
                />
              </label>
            </div>

            <label className="admin-lifestyle">
              <input
                type="checkbox"
                name="is_active"
                value="true"
                checked={banner.is_active}
                onChange={(e) => setBanner({ ...banner, is_active: e.target.checked })}
              />
              {" "}Banner visible en la tienda
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button type="submit" className="dark-button">
                GUARDAR BANNER
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
