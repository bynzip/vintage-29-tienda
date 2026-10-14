"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Filter, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadMediaAction, deleteMediaAssetAction } from "@/app/admin/actions";
import type { ViewMediaUsageRow } from "@/lib/supabase/database.types";

export default function AdminMediaClient() {
  const [mediaList, setMediaList] = useState<ViewMediaUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_use" | "unused">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadMedia() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("view_media_usage")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMediaList(data as ViewMediaUsageRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMedia();
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", "general");
        const res = await uploadMediaAction(formData);
        if (res.error) {
          setUploadError(`Error subiendo ${file.name}: ${res.error}`);
          break;
        }
      }
      await loadMedia();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error durante la subida.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(item: ViewMediaUsageRow) {
    if (item.usage_count > 0) {
      const confirmInUse = confirm(
        `¡Atención! Esta imagen se está usando en ${item.usage_count} lugar(es) (${item.used_in_products?.join(", ") || "portada"}). Si la eliminas, podría dejar de verse en la tienda. ¿Deseas eliminarla de todas formas?`
      );
      if (!confirmInUse) return;
    } else {
      if (!confirm(`¿Eliminar definitivamente "${item.file_name}" del almacenamiento?`)) return;
    }

    setDeletingId(item.id);
    try {
      await deleteMediaAssetAction(item.id, item.file_path);
      setMediaList((current) => current.filter((m) => m.id !== item.id));
    } finally {
      setDeletingId(null);
    }
  }

  function copyToClipboard(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Filtrado y búsqueda
  const filteredList = useMemo(() => {
    return mediaList.filter((item) => {
      // Filtro de estado
      if (statusFilter === "in_use" && item.usage_count === 0) return false;
      if (statusFilter === "unused" && item.usage_count > 0) return false;

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.file_name.toLowerCase().includes(query);
        const matchesPath = item.file_path.toLowerCase().includes(query);
        const matchesProduct = (item.used_in_products ?? []).some((p) =>
          p.toLowerCase().includes(query)
        );
        return matchesName || matchesPath || matchesProduct;
      }
      return true;
    });
  }, [mediaList, statusFilter, searchQuery]);

  // Métricas
  const totalFiles = mediaList.length;
  const inUseCount = mediaList.filter((m) => m.usage_count > 0).length;
  const unusedCount = totalFiles - inUseCount;
  const totalSizeBytes = mediaList.reduce((acc, m) => acc + (m.file_size_bytes || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="admin-catalog-page">
      <div className="admin-catalog-heading">
        <div>
          <span className="eyebrow">ALMACENAMIENTO & CONTENIDO</span>
          <h1>Biblioteca de Medios</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="dark-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
            {isUploading ? "SUBIENDO…" : "SUBIR ARCHIVOS"}
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="admin-alert" role="alert" style={{ marginBottom: "16px" }}>
          {uploadError}
          <button type="button" onClick={() => setUploadError(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </p>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "22px" }}>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Archivos</span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>{totalFiles}</p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#1e6b37", textTransform: "uppercase", letterSpacing: "0.05em" }}>En Uso</span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0", color: "#1e6b37" }}>{inUseCount}</p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sin Uso (Huérfanas)</span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0", color: "#b45309" }}>{unusedCount}</p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>Espacio Usado</span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>{totalSizeMB} MB</p>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <div style={{ position: "relative", minWidth: "260px", flex: "1 1 300px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#777" }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de archivo o prenda…"
            style={{ width: "100%", paddingLeft: "32px", minHeight: "36px", fontSize: "11px", border: "1px solid var(--line)", background: "#fff" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={statusFilter === "all" ? "dark-button" : "outline-button"}
            onClick={() => setStatusFilter("all")}
            style={{ fontSize: "10px", padding: "6px 12px" }}
          >
            TODAS ({totalFiles})
          </button>
          <button
            type="button"
            className={statusFilter === "in_use" ? "dark-button" : "outline-button"}
            onClick={() => setStatusFilter("in_use")}
            style={{ fontSize: "10px", padding: "6px 12px" }}
          >
            EN USO ({inUseCount})
          </button>
          <button
            type="button"
            className={statusFilter === "unused" ? "dark-button" : "outline-button"}
            onClick={() => setStatusFilter("unused")}
            style={{ fontSize: "10px", padding: "6px 12px" }}
          >
            HUÉRFANAS ({unusedCount})
          </button>
        </div>
      </div>

      {/* GRID DE MEDIOS */}
      {loading ? (
        <div className="admin-loading"><p>Cargando biblioteca de medios…</p></div>
      ) : filteredList.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}>
          {filteredList.map((item) => {
            const inUse = item.usage_count > 0;
            const sizeKB = item.file_size_bytes ? Math.round(item.file_size_bytes / 1024) : null;
            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--line)",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Miniatura */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", background: "#f6f5f3" }}>
                  <Image
                    src={item.public_url}
                    alt={item.file_name}
                    fill
                    sizes="200px"
                    quality={60}
                    style={{ objectFit: "cover" }}
                    unoptimized={item.content_type?.includes("video")}
                  />
                  {/* Badge de estado */}
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      fontSize: "9px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "2px",
                      background: inUse ? "#eef8f1" : "#fef3c7",
                      color: inUse ? "#1e6b37" : "#b45309",
                      border: inUse ? "1px solid #c2e9cd" : "1px solid #fde68a",
                    }}
                  >
                    {inUse ? `En uso (${item.usage_count})` : "Sin uso"}
                  </span>
                </div>

                {/* Información */}
                <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                  <p
                    title={item.file_name}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.file_name}
                  </p>

                  <div style={{ fontSize: "9px", color: "#777", display: "flex", justifyContent: "space-between" }}>
                    <span>{sizeKB ? `${sizeKB} KB` : "—"}</span>
                    <span>{item.file_path.split("/")[0]}</span>
                  </div>

                  {/* Prendas donde se usa */}
                  {inUse && item.used_in_products && item.used_in_products.length > 0 && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ fontSize: "8px", color: "#888", display: "block" }}>USADO EN:</span>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#333",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.used_in_products.join(", ")}
                      >
                        {item.used_in_products.join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid #f0eeea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.public_url, item.id)}
                      title="Copiar URL pública"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "9px",
                        color: copiedId === item.id ? "#1e6b37" : "#666",
                      }}
                    >
                      {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === item.id ? "Copiado" : "Copiar Link"}
                    </button>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <a
                        href={item.public_url}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver en pestaña nueva"
                        style={{ color: "#666" }}
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        title="Eliminar de la biblioteca"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", padding: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="admin-gallery-empty">No se encontraron archivos con los filtros seleccionados.</p>
      )}
    </div>
  );
}
