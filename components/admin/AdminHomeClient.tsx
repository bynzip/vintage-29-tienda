"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpDown,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  saveHomeSlideAction,
  deleteHomeSlideAction,
  saveHomeBannerAction,
  uploadMediaAction,
  toggleHomeSlideActiveAction,
  toggleHomeBannerActiveAction,
  reorderHomeSlidesAction,
} from "@/app/admin/actions";
import type { HomeSlideRow, HomeBannerRow } from "@/lib/supabase/database.types";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
}

export default function AdminHomeClient() {
  const [slides, setSlides] = useState<HomeSlideRow[]>([]);
  const [mainPromo, setMainPromo] = useState<HomeBannerRow | null>(null);
  const [couponBanner, setCouponBanner] = useState<HomeBannerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Partial<HomeSlideRow> | null>(null);
  const [savingSlide, setSavingSlide] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState(false);
  const slideFileInputRef = useRef<HTMLInputElement>(null);

  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState<HomeSlideRow[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<HomeBannerRow> | null>(null);
  const [savingPromo, setSavingPromo] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const promoFileInputRef = useRef<HTMLInputElement>(null);

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<HomeBannerRow> | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [uploadingCoupon, setUploadingCoupon] = useState(false);
  const couponFileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("No se pudo conectar con la base de datos.");
      setLoading(false);
      return;
    }

    const [slidesRes, mainPromoRes, couponRes] = await Promise.all([
      supabase.from("home_slides").select("*").order("sort_order", { ascending: true }),
      supabase.from("home_banners").select("*").eq("identifier", "main_promo").maybeSingle(),
      supabase.from("home_banners").select("*").eq("identifier", "coupon_banner").maybeSingle(),
    ]);

    if (slidesRes.data) setSlides(slidesRes.data);
    if (mainPromoRes.data) setMainPromo(mainPromoRes.data);
    if (couponRes.data) setCouponBanner(couponRes.data);
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
  async function handleToggleSlideActive(id: string, currentActive: boolean) {
    const nextActive = !currentActive;
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: nextActive } : s))
    );
    const res = await toggleHomeSlideActiveAction(id, nextActive);
    if (res.error) {
      setError(res.error);
      loadData();
    } else {
      notify(nextActive ? "Slide activado en la tienda." : "Slide desactivado.");
    }
  }

  async function handleSlideUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video") || /\.(mp4|mov|webm)$/i.test(file.name);
    setUploadingSlide(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "home");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setError(res.error || "No se pudo subir el archivo multimedia.");
      } else {
        setEditingSlide((prev) => ({
          ...prev,
          media_url: res.publicUrl,
          media_type: isVideo ? "video" : "image",
        }));
      }
    } finally {
      setUploadingSlide(false);
      if (slideFileInputRef.current) slideFileInputRef.current.value = "";
    }
  }

  async function handleSaveSlide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSlide?.media_url) {
      setError("Debes subir o asignar una imagen o video.");
      return;
    }
    setSavingSlide(true);
    const formData = new FormData();
    if (editingSlide.id) formData.set("id", editingSlide.id);
    formData.set("media_url", editingSlide.media_url);
    formData.set("media_type", editingSlide.media_type ?? (isVideoUrl(editingSlide.media_url) ? "video" : "image"));
    formData.set("href", editingSlide.href ?? "#productos");
    formData.set("sort_order", String(editingSlide.sort_order ?? slides.length + 1));
    formData.set("is_active", editingSlide.is_active ? "true" : "false");

    const res = await saveHomeSlideAction(formData);
    setSavingSlide(false);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Slide guardado correctamente.");
      setSlideModalOpen(false);
      setEditingSlide(null);
      loadData();
    }
  }

  async function handleDeleteSlide(id: string) {
    if (!confirm("¿Deseas eliminar este slide de la portada permanentemente?")) return;
    const res = await deleteHomeSlideAction(id);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Slide eliminado de la tienda.");
      loadData();
    }
  }

  // --- Reorder Slides Handlers ---
  function openReorderModal() {
    setReorderItems([...slides]);
    setReorderModalOpen(true);
  }

  async function handleSaveReorder() {
    setSavingReorder(true);
    const orderedIds = reorderItems.map((s) => s.id);
    const res = await reorderHomeSlidesAction(orderedIds);
    setSavingReorder(false);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Orden de slides actualizado con éxito.");
      setReorderModalOpen(false);
      loadData();
    }
  }

  // --- Promo Banner Handlers ---
  async function handleToggleMainPromoActive(currentActive: boolean) {
    if (!mainPromo) return;
    const nextActive = !currentActive;
    setMainPromo({ ...mainPromo, is_active: nextActive });
    const res = await toggleHomeBannerActiveAction("main_promo", nextActive);
    if (res.error) {
      setError(res.error);
      loadData();
    } else {
      notify(nextActive ? "Banner promocional activado." : "Banner promocional desactivado.");
    }
  }

  async function handlePromoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPromo(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "home");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setError(res.error || "No se pudo subir el archivo multimedia del banner.");
      } else {
        setEditingPromo((prev) => ({
          ...prev,
          image_url: res.publicUrl!,
        }));
      }
    } finally {
      setUploadingPromo(false);
      if (promoFileInputRef.current) promoFileInputRef.current.value = "";
    }
  }

  async function handleSavePromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPromo?.image_url) {
      setError("Debes subir o asignar una imagen o video para el banner.");
      return;
    }
    setSavingPromo(true);
    const formData = new FormData();
    formData.set("identifier", "main_promo");
    formData.set("title", editingPromo.title ?? "Blouses Collection");
    if (editingPromo.subtitle) formData.set("subtitle", editingPromo.subtitle);
    formData.set("button_label", editingPromo.button_label ?? "Comprar ahora");
    formData.set("href", editingPromo.href ?? "#productos");
    formData.set("image_url", editingPromo.image_url);
    formData.set("is_active", editingPromo.is_active ? "true" : "false");

    const res = await saveHomeBannerAction(formData);
    setSavingPromo(false);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Banner promocional guardado correctamente.");
      setPromoModalOpen(false);
      setEditingPromo(null);
      loadData();
    }
  }

  // --- Coupon Mini Banner Handlers ---
  async function handleToggleCouponActive(currentActive: boolean) {
    if (!couponBanner) return;
    const nextActive = !currentActive;
    setCouponBanner({ ...couponBanner, is_active: nextActive });
    const res = await toggleHomeBannerActiveAction("coupon_banner", nextActive);
    if (res.error) {
      setError(res.error);
      loadData();
    } else {
      notify(nextActive ? "Mini banner activado." : "Mini banner desactivado.");
    }
  }

  async function handleCouponUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingCoupon(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "home");
      const res = await uploadMediaAction(formData);
      if (res.error || !res.publicUrl) {
        setError(res.error || "No se pudo subir el archivo para el mini banner.");
      } else {
        setEditingCoupon((prev) => ({
          ...prev,
          image_url: res.publicUrl!,
        }));
      }
    } finally {
      setUploadingCoupon(false);
      if (couponFileInputRef.current) couponFileInputRef.current.value = "";
    }
  }

  async function handleSaveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCoupon?.image_url) {
      setError("Debes asignar una imagen o video para el mini banner.");
      return;
    }
    setSavingCoupon(true);
    const formData = new FormData();
    formData.set("identifier", "coupon_banner");
    formData.set("title", editingCoupon.title || "Mini banner promocional");
    formData.set("button_label", "Ver promoción");
    formData.set("href", editingCoupon.href ?? "#productos");
    formData.set("image_url", editingCoupon.image_url);
    formData.set("is_active", editingCoupon.is_active ? "true" : "false");

    const res = await saveHomeBannerAction(formData);
    setSavingCoupon(false);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Mini banner guardado correctamente.");
      setCouponModalOpen(false);
      setEditingCoupon(null);
      loadData();
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <p>Cargando configuración del inicio…</p>
      </div>
    );
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN DEL HOME</span>
          <h1>Configuración de la Página de Inicio</h1>
          <p>
            Gestiona los componentes visuales de la tienda: Carrusel de portada,
            Mini banner promocional y Banner inferior.
          </p>
        </div>
      </div>

      {error && (
        <p className="admin-alert" role="alert" style={{ marginBottom: "16px" }}>
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </p>
      )}

      {successMessage && (
        <p
          className="admin-banner-success"
          style={{
            padding: "10px 14px",
            background: "#eef8f1",
            color: "#1e6b37",
            fontSize: "12px",
            border: "1px solid #c2e9cd",
            marginBottom: "16px",
          }}
        >
          {successMessage}
        </p>
      )}

      {/* ======================================================== */}
      {/* SECCIÓN 1: CARRUSEL DE PORTADA (HERO CAROUSEL)           */}
      {/* ======================================================== */}
      <section className="admin-form-section" style={{ marginBottom: "28px" }}>
        <div className="admin-gallery-heading">
          <div>
            <h2>Carrusel Principal (Portada)</h2>
            <p>
              Imágenes y videos a pantalla completa. Toda el área de la portada es
              clickeable y redirige al enlace configurado.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="outline-button"
              onClick={openReorderModal}
              disabled={slides.length < 2}
              title="Reordenar la secuencia de slides"
            >
              <ArrowUpDown size={14} /> ORDENAR
            </button>
            <button
              type="button"
              className="dark-button"
              onClick={() => {
                setEditingSlide({
                  media_url: "",
                  media_type: "image",
                  href: "#productos",
                  sort_order: slides.length + 1,
                  is_active: true,
                });
                setSlideModalOpen(true);
              }}
            >
              <Plus size={14} /> AÑADIR SLIDE
            </button>
          </div>
        </div>

        {slides.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {slides.map((slide, index) => {
              const isVideo =
                slide.media_type === "video" || isVideoUrl(slide.media_url);

              return (
                <div
                  key={slide.id}
                  className={`admin-home-row${slide.is_active ? "" : " is-inactive"}`}
                >
                  <div className="admin-home-thumb">
                    {isVideo ? (
                      <video
                        src={slide.media_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={slide.media_url}
                        alt=""
                        fill
                        sizes="80px"
                        quality={50}
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>

                  <div className="admin-home-info">
                    <span className="admin-home-title">
                      Slide #{index + 1} ({isVideo ? "Video" : "Imagen"})
                    </span>
                    <span className="admin-home-sub">
                      Redirección: <strong>{slide.href || "#productos"}</strong>
                    </span>
                  </div>

                  <div className="admin-switch-field" title="Activar / Desactivar en la tienda">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={slide.is_active}
                      aria-label="Activar o desactivar slide"
                      className={`admin-switch${slide.is_active ? " is-on" : ""}`}
                      onClick={() => handleToggleSlideActive(slide.id, slide.is_active)}
                    >
                      <span />
                    </button>
                  </div>

                  <div className="admin-home-actions">
                    <button
                      type="button"
                      className="admin-clean-btn"
                      title="Editar slide"
                      onClick={() => {
                        setEditingSlide(slide);
                        setSlideModalOpen(true);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="admin-clean-btn danger"
                      title="Eliminar slide"
                      onClick={() => handleDeleteSlide(slide.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="admin-gallery-empty">
            No hay slides configurados. Añade uno con el botón superior.
          </p>
        )}
      </section>

      {/* ======================================================== */}
      {/* SECCIÓN 2: MINI BANNER (DEBAJO DE PORTADA)               */}
      {/* ======================================================== */}
      <section className="admin-form-section" style={{ marginBottom: "28px" }}>
        <div className="admin-gallery-heading">
          <div>
            <h2>Mini Banner Promocional</h2>
            <p>
              Banner horizontal de altura reducida colocado directamente pegado
              debajo del carrusel principal. Soporta imagen o video.
            </p>
          </div>
        </div>

        {couponBanner ? (
          <div className={`admin-home-row${couponBanner.is_active ? "" : " is-inactive"}`}>
            <div className="admin-home-thumb">
              {isVideoUrl(couponBanner.image_url) ? (
                <video
                  src={couponBanner.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={couponBanner.image_url}
                  alt=""
                  fill
                  sizes="80px"
                  quality={50}
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>

            <div className="admin-home-info">
              <span className="admin-home-title">
                Mini Banner ({isVideoUrl(couponBanner.image_url) ? "Video" : "Imagen"})
              </span>
              <span className="admin-home-sub">
                Destino: <strong>{couponBanner.href || "#productos"}</strong>
              </span>
            </div>

            <div className="admin-switch-field" title="Activar / Desactivar mini banner">
              <button
                type="button"
                role="switch"
                aria-checked={couponBanner.is_active}
                aria-label="Activar o desactivar mini banner"
                className={`admin-switch${couponBanner.is_active ? " is-on" : ""}`}
                onClick={() => handleToggleCouponActive(couponBanner.is_active)}
              >
                <span />
              </button>
            </div>

            <div className="admin-home-actions">
              <button
                type="button"
                className="admin-clean-btn"
                title="Editar mini banner"
                onClick={() => {
                  setEditingCoupon(couponBanner);
                  setCouponModalOpen(true);
                }}
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-home-row is-inactive">
            <div className="admin-home-thumb" style={{ display: "grid", placeItems: "center", color: "#888", fontSize: "10px" }}>
              Vacío
            </div>
            <div className="admin-home-info">
              <span className="admin-home-title">Mini Banner no configurado</span>
              <span className="admin-home-sub">Haz clic en Configurar para añadir una imagen o video.</span>
            </div>
            <div />
            <div className="admin-home-actions">
              <button
                type="button"
                className="outline-button"
                style={{ fontSize: "11px", padding: "4px 10px" }}
                onClick={() => {
                  setEditingCoupon({
                    image_url: "",
                    href: "#productos",
                    title: "Mini banner promocional",
                    is_active: true,
                  });
                  setCouponModalOpen(true);
                }}
              >
                CONFIGURAR
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* SECCIÓN 3: BANNER PROMOCIONAL INFERIOR                   */}
      {/* ======================================================== */}
      <section className="admin-form-section">
        <div className="admin-gallery-heading">
          <div>
            <h2>Banner Promocional</h2>
            <p>
              Banner destacado que se ubica después del catálogo de productos.
              Incluye título, subtítulo y botón de llamado a la acción. Admite imagen o video.
            </p>
          </div>
        </div>

        {mainPromo ? (
          <div className={`admin-home-row${mainPromo.is_active ? "" : " is-inactive"}`}>
            <div className="admin-home-thumb">
              {isVideoUrl(mainPromo.image_url) ? (
                <video
                  src={mainPromo.image_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={mainPromo.image_url}
                  alt=""
                  fill
                  sizes="80px"
                  quality={50}
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>

            <div className="admin-home-info">
              <span className="admin-home-title">
                {mainPromo.title} ({isVideoUrl(mainPromo.image_url) ? "Video" : "Imagen"})
              </span>
              <span className="admin-home-sub">
                Botón: &ldquo;{mainPromo.button_label}&rdquo; → {mainPromo.href}
              </span>
            </div>

            <div className="admin-switch-field" title="Activar / Desactivar banner promocional">
              <button
                type="button"
                role="switch"
                aria-checked={mainPromo.is_active}
                aria-label="Activar o desactivar banner promocional"
                className={`admin-switch${mainPromo.is_active ? " is-on" : ""}`}
                onClick={() => handleToggleMainPromoActive(mainPromo.is_active)}
              >
                <span />
              </button>
            </div>

            <div className="admin-home-actions">
              <button
                type="button"
                className="admin-clean-btn"
                title="Editar banner"
                onClick={() => {
                  setEditingPromo(mainPromo);
                  setPromoModalOpen(true);
                }}
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-home-row is-inactive">
            <div className="admin-home-thumb" style={{ display: "grid", placeItems: "center", color: "#888", fontSize: "10px" }}>
              Vacío
            </div>
            <div className="admin-home-info">
              <span className="admin-home-title">Banner Promocional no configurado</span>
              <span className="admin-home-sub">Haz clic en Configurar para crearlo.</span>
            </div>
            <div />
            <div className="admin-home-actions">
              <button
                type="button"
                className="outline-button"
                style={{ fontSize: "11px", padding: "4px 10px" }}
                onClick={() => {
                  setEditingPromo({
                    title: "Blouses Collection",
                    subtitle: "Descubre nuestra selección especial de temporada",
                    button_label: "Comprar ahora",
                    href: "#productos",
                    image_url: "",
                    is_active: true,
                  });
                  setPromoModalOpen(true);
                }}
              >
                CONFIGURAR
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* MODAL 1: EDITAR / AÑADIR SLIDE                           */}
      {/* ======================================================== */}
      {slideModalOpen && editingSlide && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSlideModalOpen(false);
              setEditingSlide(null);
            }
          }}
        >
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>{editingSlide.id ? "Editar Slide" : "Nuevo Slide de Portada"}</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setSlideModalOpen(false);
                  setEditingSlide(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveSlide}
              style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
            >
              <div className="admin-modal-content">
                {/* Vista previa respetando márgenes internos y con esquinas redondeadas */}
                <div className="admin-modal-media-preview">
                  {editingSlide.media_url ? (
                    isVideoUrl(editingSlide.media_url) || editingSlide.media_type === "video" ? (
                      <video
                        src={editingSlide.media_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={editingSlide.media_url}
                        alt=""
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="admin-modal-media-empty">
                      <Upload size={26} />
                      <span style={{ fontSize: "11px" }}>Sin archivo multimedia seleccionado</span>
                    </div>
                  )}
                </div>

                <div className="admin-field">
                  <label>Archivo Multimedia (Imagen o Video hasta 50MB) *</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      name="media_url"
                      value={editingSlide.media_url ?? ""}
                      required
                      placeholder="URL pública o sube un archivo"
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingSlide({
                          ...editingSlide,
                          media_url: val,
                          media_type: isVideoUrl(val) ? "video" : "image",
                        });
                      }}
                      style={{ flex: 1 }}
                    />
                    <input
                      ref={slideFileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
                      onChange={handleSlideUpload}
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

                <div className="admin-field">
                  <label>Link de Redirección (al hacer clic en la portada) *</label>
                  <input
                    name="href"
                    value={editingSlide.href ?? ""}
                    required
                    placeholder="Ej. /categoria/blusas, #productos o enlace externo"
                    onChange={(e) => setEditingSlide({ ...editingSlide, href: e.target.value })}
                  />
                  <span style={{ fontSize: "10px", color: "#777", marginTop: "3px", display: "block" }}>
                    Al hacer clic en cualquier lugar de esta imagen en la portada, se abrirá este enlace.
                  </span>
                </div>

                <div className="admin-switch-field" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingSlide.is_active ?? true}
                    className={`admin-switch${(editingSlide.is_active ?? true) ? " is-on" : ""}`}
                    onClick={() =>
                      setEditingSlide({
                        ...editingSlide,
                        is_active: !(editingSlide.is_active ?? true),
                      })
                    }
                  >
                    <span />
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 500 }}>
                    Slide activo y visible en la tienda
                  </span>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setSlideModalOpen(false);
                    setEditingSlide(null);
                  }}
                  disabled={savingSlide}
                >
                  CANCELAR
                </button>
                <button type="submit" className="dark-button" disabled={savingSlide}>
                  {savingSlide ? <Loader2 className="animate-spin" size={14} /> : null}
                  {savingSlide ? "GUARDANDO…" : "GUARDAR SLIDE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ORDENAR SLIDES (DRAG AND DROP)                  */}
      {/* ======================================================== */}
      {reorderModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReorderModalOpen(false);
          }}
        >
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Ordenar Slides del Carrusel</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setReorderModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-content">
              <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
                Arrastra y suelta los elementos para definir el orden en que aparecerán
                las imágenes o videos en el carrusel principal.
              </p>

              <div className="admin-reorder-list">
                {reorderItems.map((item, index) => {
                  const isVideo =
                    item.media_type === "video" || isVideoUrl(item.media_url);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedIndex(index);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverIndex !== index) setDragOverIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverIndex === index) setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverIndex(null);
                        if (draggedIndex === null || draggedIndex === index) return;
                        const next = [...reorderItems];
                        const [moved] = next.splice(draggedIndex, 1);
                        next.splice(index, 0, moved);
                        setReorderItems(next);
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`admin-reorder-item${
                        draggedIndex === index ? " is-dragging" : ""
                      }${dragOverIndex === index ? " is-drag-over" : ""}`}
                    >
                      <GripVertical size={16} color="#888" style={{ flexShrink: 0 }} />

                      <div
                        style={{
                          position: "relative",
                          width: "50px",
                          height: "32px",
                          background: "#f2f0ec",
                          border: "1px solid #eae8e3",
                          overflow: "hidden",
                          borderRadius: "6px",
                          flexShrink: 0,
                        }}
                      >
                        {isVideo ? (
                          <video
                            src={item.media_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Image
                            src={item.media_url}
                            alt=""
                            fill
                            sizes="50px"
                            quality={40}
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>

                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <strong style={{ fontSize: "11px", display: "block" }}>
                          #{index + 1} &middot; {isVideo ? "Video" : "Imagen"}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#666",
                            display: "block",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {item.href || "#productos"}
                        </span>
                      </div>

                      <span style={{ fontSize: "11px", color: "#888", textAlign: "right" }}>
                        #{index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setReorderModalOpen(false)}
                disabled={savingReorder}
              >
                CANCELAR
              </button>
              <button
                type="button"
                className="dark-button"
                onClick={handleSaveReorder}
                disabled={savingReorder}
              >
                {savingReorder ? <Loader2 className="animate-spin" size={14} /> : null}
                {savingReorder ? "GUARDANDO…" : "GUARDAR ORDEN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDITAR MINI BANNER                              */}
      {/* ======================================================== */}
      {couponModalOpen && editingCoupon && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCouponModalOpen(false);
              setEditingCoupon(null);
            }
          }}
        >
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Editar Mini Banner</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setCouponModalOpen(false);
                  setEditingCoupon(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveCoupon}
              style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
            >
              <div className="admin-modal-content">
                {/* Vista previa respetando márgenes internos y con esquinas redondeadas */}
                <div className="admin-modal-media-preview">
                  {editingCoupon.image_url ? (
                    isVideoUrl(editingCoupon.image_url) ? (
                      <video
                        src={editingCoupon.image_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={editingCoupon.image_url}
                        alt=""
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="admin-modal-media-empty">
                      <Upload size={26} />
                      <span style={{ fontSize: "11px" }}>Sin imagen o video seleccionado</span>
                    </div>
                  )}
                </div>

                <div className="admin-field">
                  <label>Archivo Multimedia (Imagen o Video) *</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      name="image_url"
                      value={editingCoupon.image_url ?? ""}
                      required
                      placeholder="URL pública de la imagen o video"
                      onChange={(e) =>
                        setEditingCoupon({ ...editingCoupon, image_url: e.target.value })
                      }
                      style={{ flex: 1 }}
                    />
                    <input
                      ref={couponFileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
                      onChange={handleCouponUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => couponFileInputRef.current?.click()}
                      disabled={uploadingCoupon}
                    >
                      {uploadingCoupon ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                      {uploadingCoupon ? "SUBIENDO…" : "SUBIR"}
                    </button>
                  </div>
                </div>

                <div className="admin-field">
                  <label>Link de Redirección (href) *</label>
                  <input
                    name="href"
                    value={editingCoupon.href ?? ""}
                    required
                    placeholder="Ej. /categoria/ofertas o #productos"
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, href: e.target.value })
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>Texto descriptivo / Alt (opcional)</label>
                  <input
                    name="title"
                    value={editingCoupon.title ?? ""}
                    placeholder="Ej. Descuento especial de temporada"
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, title: e.target.value })
                    }
                  />
                </div>

                <div className="admin-switch-field" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingCoupon.is_active ?? true}
                    className={`admin-switch${(editingCoupon.is_active ?? true) ? " is-on" : ""}`}
                    onClick={() =>
                      setEditingCoupon({
                        ...editingCoupon,
                        is_active: !(editingCoupon.is_active ?? true),
                      })
                    }
                  >
                    <span />
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 500 }}>
                    Mini banner visible en la tienda
                  </span>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setCouponModalOpen(false);
                    setEditingCoupon(null);
                  }}
                  disabled={savingCoupon}
                >
                  CANCELAR
                </button>
                <button type="submit" className="dark-button" disabled={savingCoupon}>
                  {savingCoupon ? <Loader2 className="animate-spin" size={14} /> : null}
                  {savingCoupon ? "GUARDANDO…" : "GUARDAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: EDITAR BANNER PROMOCIONAL                       */}
      {/* ======================================================== */}
      {promoModalOpen && editingPromo && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPromoModalOpen(false);
              setEditingPromo(null);
            }
          }}
        >
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Editar Banner Promocional</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setPromoModalOpen(false);
                  setEditingPromo(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSavePromo}
              style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
            >
              <div className="admin-modal-content">
                {/* Vista previa respetando márgenes internos y con esquinas redondeadas */}
                <div className="admin-modal-media-preview">
                  {editingPromo.image_url ? (
                    isVideoUrl(editingPromo.image_url) ? (
                      <video
                        src={editingPromo.image_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={editingPromo.image_url}
                        alt=""
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="admin-modal-media-empty">
                      <Upload size={26} />
                      <span style={{ fontSize: "11px" }}>Sin imagen o video seleccionado</span>
                    </div>
                  )}
                </div>

                <div className="admin-field">
                  <label>Archivo Multimedia (Imagen o Video) *</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="text"
                      name="image_url"
                      value={editingPromo.image_url ?? ""}
                      required
                      placeholder="URL pública de la imagen o video"
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, image_url: e.target.value })
                      }
                      style={{ flex: 1 }}
                    />
                    <input
                      ref={promoFileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
                      onChange={handlePromoUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => promoFileInputRef.current?.click()}
                      disabled={uploadingPromo}
                    >
                      {uploadingPromo ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                      {uploadingPromo ? "SUBIENDO…" : "SUBIR"}
                    </button>
                  </div>
                </div>

                <div className="admin-field">
                  <label>Título del Banner *</label>
                  <input
                    name="title"
                    value={editingPromo.title ?? ""}
                    required
                    placeholder="Ej. Blouses Collection"
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, title: e.target.value })
                    }
                  />
                </div>

                <div className="admin-field">
                  <label>Subtítulo (opcional)</label>
                  <input
                    name="subtitle"
                    value={editingPromo.subtitle ?? ""}
                    placeholder="Ej. Descubre nuestra selección especial de temporada"
                    onChange={(e) =>
                      setEditingPromo({ ...editingPromo, subtitle: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="admin-field">
                    <label>Texto del Botón *</label>
                    <input
                      name="button_label"
                      value={editingPromo.button_label ?? ""}
                      required
                      placeholder="Ej. Comprar ahora"
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, button_label: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Enlace de Redirección (href) *</label>
                    <input
                      name="href"
                      value={editingPromo.href ?? ""}
                      required
                      placeholder="Ej. #productos o /categoria/blusas"
                      onChange={(e) =>
                        setEditingPromo({ ...editingPromo, href: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="admin-switch-field" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingPromo.is_active ?? true}
                    className={`admin-switch${(editingPromo.is_active ?? true) ? " is-on" : ""}`}
                    onClick={() =>
                      setEditingPromo({
                        ...editingPromo,
                        is_active: !(editingPromo.is_active ?? true),
                      })
                    }
                  >
                    <span />
                  </button>
                  <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 500 }}>
                    Banner visible en la tienda
                  </span>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setPromoModalOpen(false);
                    setEditingPromo(null);
                  }}
                  disabled={savingPromo}
                >
                  CANCELAR
                </button>
                <button type="submit" className="dark-button" disabled={savingPromo}>
                  {savingPromo ? <Loader2 className="animate-spin" size={14} /> : null}
                  {savingPromo ? "GUARDANDO…" : "GUARDAR BANNER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
