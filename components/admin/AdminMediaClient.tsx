"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { uploadMediaAction, deleteMediaAssetAction } from "@/app/admin/actions";
import type { ViewMediaUsageRow } from "@/lib/supabase/database.types";

type ViewMode = "grid-large" | "grid-medium" | "grid-small" | "rows";
type GroupBy = "none" | "product";

export default function AdminMediaClient() {
  const [mediaList, setMediaList] = useState<ViewMediaUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_use" | "unused">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid-medium");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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

  // Agrupación por Producto (estilo Explorador de Windows)
  const groupedData = useMemo(() => {
    if (groupBy !== "product") return null;

    const map = new Map<string, ViewMediaUsageRow[]>();

    for (const item of filteredList) {
      if (item.used_in_products && item.used_in_products.length > 0) {
        for (const prod of item.used_in_products) {
          const groupName = prod;
          if (!map.has(groupName)) map.set(groupName, []);
          map.get(groupName)!.push(item);
        }
      } else if (item.usage_count > 0) {
        const groupName = "Portada y Elementos de Tienda";
        if (!map.has(groupName)) map.set(groupName, []);
        map.get(groupName)!.push(item);
      } else {
        const groupName = "Sin producto asignado (Huérfanas)";
        if (!map.has(groupName)) map.set(groupName, []);
        map.get(groupName)!.push(item);
      }
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a.startsWith("Sin producto")) return 1;
      if (b.startsWith("Sin producto")) return -1;
      if (a.startsWith("Portada")) return 1;
      if (b.startsWith("Portada")) return -1;
      return a.localeCompare(b, "es");
    });

    return sortedKeys.map((key) => ({
      groupName: key,
      items: map.get(key)!,
    }));
  }, [filteredList, groupBy]);

  function toggleGroup(groupName: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }

  function expandAllGroups() {
    setCollapsedGroups(new Set());
  }

  function collapseAllGroups() {
    if (!groupedData) return;
    setCollapsedGroups(new Set(groupedData.map((g) => g.groupName)));
  }

  // Métricas
  const totalFiles = mediaList.length;
  const inUseCount = mediaList.filter((m) => m.usage_count > 0).length;
  const unusedCount = totalFiles - inUseCount;
  const totalSizeBytes = mediaList.reduce((acc, m) => acc + (m.file_size_bytes || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  // Renderizador de un ítem en modo Card (Grid)
  function renderCard(item: ViewMediaUsageRow, mode: "grid-large" | "grid-medium" | "grid-small") {
    const inUse = item.usage_count > 0;
    const sizeKB = item.file_size_bytes ? Math.round(item.file_size_bytes / 1024) : null;
    const isSmall = mode === "grid-small";

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
            sizes={isSmall ? "130px" : mode === "grid-large" ? "300px" : "200px"}
            quality={60}
            style={{ objectFit: "cover" }}
            unoptimized={item.content_type?.includes("video")}
          />
          {/* Badge de estado */}
          <span
            style={{
              position: "absolute",
              top: isSmall ? "4px" : "8px",
              left: isSmall ? "4px" : "8px",
              fontSize: isSmall ? "8px" : "9px",
              fontWeight: 600,
              padding: isSmall ? "1px 4px" : "2px 6px",
              borderRadius: "2px",
              background: inUse ? "#eef8f1" : "#fef3c7",
              color: inUse ? "#1e6b37" : "#b45309",
              border: inUse ? "1px solid #c2e9cd" : "1px solid #fde68a",
            }}
          >
            {inUse ? (isSmall ? `Uso (${item.usage_count})` : `En uso (${item.usage_count})`) : "Sin uso"}
          </span>
        </div>

        {/* Información */}
        <div style={{ padding: isSmall ? "6px" : "10px", flex: 1, display: "flex", flexDirection: "column", gap: isSmall ? "3px" : "5px" }}>
          <p
            title={item.file_name}
            style={{
              fontSize: isSmall ? "10px" : "11px",
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
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
              {item.file_path.split("/")[0]}
            </span>
          </div>

          {/* Prendas donde se usa */}
          {!isSmall && inUse && item.used_in_products && item.used_in_products.length > 0 && (
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
          <div
            style={{
              marginTop: "auto",
              paddingTop: isSmall ? "4px" : "8px",
              borderTop: "1px solid #f0eeea",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
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
                gap: "3px",
                fontSize: "9px",
                color: copiedId === item.id ? "#1e6b37" : "#666",
                padding: 0,
              }}
            >
              {copiedId === item.id ? <Check size={12} /> : <Copy size={12} />}
              {!isSmall && (copiedId === item.id ? "Copiado" : "Copiar Link")}
            </button>

            <div style={{ display: "flex", gap: "6px" }}>
              <a
                href={item.public_url}
                target="_blank"
                rel="noreferrer"
                title="Ver en pestaña nueva"
                style={{ color: "#666", display: "flex", alignItems: "center" }}
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
  }

  // Renderizador de un ítem en modo Fila (Lista)
  function renderRow(item: ViewMediaUsageRow) {
    const inUse = item.usage_count > 0;
    const sizeKB = item.file_size_bytes ? Math.round(item.file_size_bytes / 1024) : null;
    const folder = item.file_path.includes("/") ? item.file_path.split("/").slice(0, -1).join("/") : "";

    return (
      <div key={item.id} className="media-row-item">
        <div className="media-row-thumb">
          <Image
            src={item.public_url}
            alt={item.file_name}
            fill
            sizes="46px"
            quality={50}
            unoptimized={item.content_type?.includes("video")}
          />
        </div>

        <div className="media-row-info">
          <span className="media-row-name" title={item.file_name}>
            {item.file_name}
          </span>
          <span className="media-row-path" title={item.file_path}>
            {folder || item.file_path}
          </span>
        </div>

        <div className="media-row-products">
          {inUse && item.used_in_products && item.used_in_products.length > 0 ? (
            item.used_in_products.map((p) => (
              <span key={p} className="media-prod-badge" title={p}>
                {p}
              </span>
            ))
          ) : (
            <span className="media-unused-badge">
              {inUse ? "Uso en portada" : "Sin asignar (huérfana)"}
            </span>
          )}
        </div>

        <span className="media-row-meta">{sizeKB ? `${sizeKB} KB` : "—"}</span>

        <span className="media-row-meta">
          {new Intl.DateTimeFormat("es-PE", { dateStyle: "short" }).format(new Date(item.created_at))}
        </span>

        <div className="media-row-actions">
          <button
            type="button"
            className="media-icon-btn"
            onClick={() => copyToClipboard(item.public_url, item.id)}
            title="Copiar URL pública"
          >
            {copiedId === item.id ? <Check size={13} color="#1e6b37" /> : <Copy size={13} />}
          </button>
          <a
            href={item.public_url}
            target="_blank"
            rel="noreferrer"
            className="media-icon-btn"
            title="Ver original"
          >
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            className="media-icon-btn danger"
            onClick={() => handleDelete(item)}
            disabled={deletingId === item.id}
            title="Eliminar archivo"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Renderizador de un grupo o conjunto de elementos según la vista
  function renderMediaSet(items: ViewMediaUsageRow[]) {
    if (viewMode === "rows") {
      return (
        <div className="media-rows-list">
          {items.map((item) => renderRow(item))}
        </div>
      );
    }

    const gridClass =
      viewMode === "grid-large"
        ? "media-grid-large"
        : viewMode === "grid-small"
        ? "media-grid-small"
        : "media-grid-medium";

    return (
      <div className={gridClass}>
        {items.map((item) => renderCard(item, viewMode))}
      </div>
    );
  }

  return (
    <main className="admin-content">
      {/* CABECERA ESTÁNDAR ADMIN */}
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">ALMACENAMIENTO & CONTENIDO</span>
          <h1>Biblioteca de Medios</h1>
          <p>{mediaList.length} archivos en Supabase Storage</p>
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
          <button
            type="button"
            onClick={() => setUploadError(null)}
            style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </p>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Archivos
          </span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>{totalFiles}</p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#1e6b37", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            En Uso
          </span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0", color: "#1e6b37" }}>
            {inUseCount}
          </p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sin Uso (Huérfanas)
          </span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0", color: "#b45309" }}>
            {unusedCount}
          </p>
        </div>
        <div style={{ padding: "14px", border: "1px solid var(--line)", background: "#fff" }}>
          <span style={{ fontSize: "10px", color: "#777", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Espacio Usado
          </span>
          <p style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>{totalSizeMB} MB</p>
        </div>
      </div>

      {/* BARRA DE FILTROS, SELECTORES Y BÚSQUEDA */}
      <div className="media-filter-bar">
        {/* Buscador de igual altura que los selectores */}
        <div className="media-search-wrap">
          <Search size={14} className="media-search-icon" />
          <input
            type="search"
            className="media-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de archivo o prenda…"
          />
        </div>

        {/* Selector de Estado / Uso */}
        <div className="media-select-wrap">
          <span className="media-select-label">Estado</span>
          <select
            className="media-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "in_use" | "unused")}
          >
            <option value="all">Todas ({totalFiles})</option>
            <option value="in_use">En uso ({inUseCount})</option>
            <option value="unused">Huérfanas ({unusedCount})</option>
          </select>
        </div>

        {/* Selector de Agrupación */}
        <div className="media-select-wrap">
          <span className="media-select-label">Agrupar</span>
          <select
            className="media-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <option value="none">Sin agrupar</option>
            <option value="product">Por Producto</option>
          </select>
        </div>

        {/* Selector de Vista (Grid grande, medio, pequeño o filas) */}
        <div className="media-select-wrap">
          <span className="media-select-label">Vista</span>
          <select
            className="media-select"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            <option value="grid-large">Grid Grande</option>
            <option value="grid-medium">Grid Medio</option>
            <option value="grid-small">Grid Pequeño</option>
            <option value="rows">Filas (Lista)</option>
          </select>
        </div>

        {/* Acciones de expandir / colapsar grupos */}
        {groupBy === "product" && groupedData && groupedData.length > 0 && (
          <div className="media-group-toggle-actions">
            <button type="button" className="media-subtle-btn" onClick={expandAllGroups}>
              Expandir todo
            </button>
            <span>·</span>
            <button type="button" className="media-subtle-btn" onClick={collapseAllGroups}>
              Colapsar todo
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO DE MEDIOS (AGRUPADO O SIMPLE) */}
      {loading ? (
        <div className="admin-loading">
          <p>Cargando biblioteca de medios…</p>
        </div>
      ) : filteredList.length === 0 ? (
        <p className="admin-gallery-empty">No se encontraron archivos con los filtros seleccionados.</p>
      ) : groupBy === "product" && groupedData ? (
        <div>
          {groupedData.map(({ groupName, items }) => {
            const isCollapsed = collapsedGroups.has(groupName);
            return (
              <section key={groupName} style={{ marginBottom: "16px" }}>
                <div
                  className="media-group-header"
                  onClick={() => toggleGroup(groupName)}
                  title="Haz clic para expandir o colapsar este grupo"
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span className="media-group-title">{groupName}</span>
                  <span className="media-group-badge">
                    {items.length} {items.length === 1 ? "foto" : "fotos"}
                  </span>
                  <div className="media-group-divider" />
                </div>
                {!isCollapsed && renderMediaSet(items)}
              </section>
            );
          })}
        </div>
      ) : (
        renderMediaSet(filteredList)
      )}
    </main>
  );
}
