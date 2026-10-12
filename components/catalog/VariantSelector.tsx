"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog/types";

export default function VariantSelector({ product }: { product: CatalogProduct }) {
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id ?? "");
  const selected = product.variants.find((variant) => variant.id === selectedId) ?? product.variants[0];
  if (!product.variants.length) return null;

  return (
    <div className="variant-selector">
      <div className="variant-selector-heading"><span>COMBINACIONES DISPONIBLES</span><strong>{selected?.name}</strong></div>
      <div className="variant-list" role="list" aria-label="Variantes del producto">
        {product.variants.map((variant) => (
          <button type="button" role="listitem" key={variant.id} className={variant.id === selected?.id ? "is-selected" : ""} onClick={() => setSelectedId(variant.id)}>
            <span>{variant.name}</span>
            <small>{variant.available ? "Disponible" : "Agotada"}</small>
          </button>
        ))}
      </div>
      {selected?.price !== null && selected?.price !== undefined && (
        <div className="variant-selected-price">
          <strong>{new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(selected.price)}</strong>
        </div>
      )}
    </div>
  );
}
