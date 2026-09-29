"use client";

import ProductCard from "@/components/ProductCard";
import { useCatalog } from "@/hooks/use-catalog";

export default function CatalogGrid() {
  const { data, isLoading, isError } = useCatalog();

  if (isLoading) {
    return <p className="catalog-status">Cargando catálogo…</p>;
  }

  if (isError || !data) {
    return <p className="catalog-status">No pudimos cargar el catálogo.</p>;
  }

  if (!data.products.length) {
    return <p className="catalog-status">Todavía no hay productos.</p>;
  }

  return (
    <div className="product-grid">
      {data.products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
