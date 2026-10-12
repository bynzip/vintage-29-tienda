import ProductGrid from "@/components/catalog/ProductGrid";
import type { CatalogResult } from "@/lib/catalog/products";

export default function CatalogGrid({ catalog }: { catalog: CatalogResult }) {
  if (catalog.status === "not-configured") {
    return (
      <p className="catalog-status" role="status">
        El catálogo estará disponible cuando se configure la conexión de la tienda.
      </p>
    );
  }

  if (catalog.status === "error") {
    return (
      <p className="catalog-status" role="alert">
        No pudimos cargar los productos en este momento. Inténtalo nuevamente más tarde.
      </p>
    );
  }

  if (catalog.products.length === 0) {
    return <p className="catalog-status">Todavía no hay productos publicados.</p>;
  }

  return <ProductGrid products={catalog.products} />;
}
