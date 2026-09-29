"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useCatalog } from "@/hooks/use-catalog";
import ProductCard from "@/components/ProductCard";

const collectionDetails: Record<
  string,
  { title: string; description: string }
> = {
  "new-arrivals": {
    title: "Recién llegado",
    description: "Looks nuevos, recién llegados. Conoce tus nuevos favoritos.",
  },
  clothing: {
    title: "Ropa",
    description: "Buena ropa para lo que tenga planeado el día.",
  },
  dresses: {
    title: "Vestidos",
    description: "El outfit de una sola prenda, a tu manera.",
  },
  sale: {
    title: "La edición de rebajas",
    description: "Algo bueno, por un poco menos.",
  },
  "going-out": {
    title: "Para salir",
    description: "La edición after-dark. Tus planes te quedan bien.",
  },
  everyday: {
    title: "Día a día",
    description: "Off-duty, siempre listo. Prendas que usarás una y otra vez.",
  },
  getaway: {
    title: "Escapada",
    description: "Prendas fáciles para donde te lleve el día.",
  },
};

export default function CollectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "new-arrivals";
  const collection = collectionDetails[slug];
  const { data, isLoading } = useCatalog();
  const products = data?.products ?? [];

  if (!collection)
    return (
      <section className="empty-state">
        <h1>No encontramos esa colección.</h1>
        <Link href="/catalogo" className="dark-button">
          VER CATÁLOGO <ArrowRight size={15} />
        </Link>
      </section>
    );

  return (
    <section className="collection-page page-gutter">
      <nav className="product-breadcrumb">
        <Link href="/">INICIO</Link>
        <span> / </span>
        <span>{collection.title}</span>
      </nav>
      <header className="collection-header">
        <span className="eyebrow">DEPT. DE COSAS BUENAS</span>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </header>
      {isLoading ? (
        <p className="catalog-status">Cargando catálogo…</p>
      ) : products.length ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Todavía no hay productos publicados.</p>
          <Link href="/catalogo" className="dark-button">
            VER CATÁLOGO <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
