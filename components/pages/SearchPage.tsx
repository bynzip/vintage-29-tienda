"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Search as SearchIcon } from "lucide-react";
import { searchProducts } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
  const params = useParams<{ query?: string }>();
  const query = params?.query ?? "";
  const term = query.replace(/-/g, " ").trim();
  const { data, isLoading } = useCatalog();
  const products = data?.products ?? [];
  const results = term ? searchProducts(products, term) : [];

  return (
    <section className="collection-page page-gutter search-results-page">
      <header className="collection-header">
        <span className="eyebrow">DEPT. DE COSAS BUENAS</span>
        <h1>{term ? `Resultados para “${term}”` : "Buscar"}</h1>
        <p>
          {isLoading
            ? "Buscando…"
            : `${results.length} ${results.length === 1 ? "prenda" : "prendas"} por explorar.`}
        </p>
      </header>
      {results.length ? (
        <div className="product-grid">
          {results.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <SearchIcon size={25} strokeWidth={1.4} />
          <p>
            {term
              ? "Todavía no encontramos coincidencias."
              : "Busca tu próximo favorito."}
          </p>
          <Link href="/catalogo" className="dark-button">
            VER CATÁLOGO <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
