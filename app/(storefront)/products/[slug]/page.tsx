import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPage from "@/components/pages/ProductPage";
import { getPublishedProductBySlug, getPublishedProducts } from "@/lib/catalog/products";

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublishedProductBySlug(slug);
  if (result.status !== "ready") return { title: "Producto no disponible" };
  return {
    title: result.product.name,
    description: result.product.description ?? `${result.product.name} · Vintage 29`,
    openGraph: {
      title: result.product.name,
      description: result.product.description ?? `${result.product.name} · Vintage 29`,
      images: result.product.cover ? [result.product.cover] : [],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublishedProductBySlug(slug);
  if (result.status === "not-found") notFound();

  if (result.status === "not-configured" || result.status === "error") {
    return (
      <section className="product-missing" role={result.status === "error" ? "alert" : "status"}>
        <h1>
          {result.status === "not-configured"
            ? "La tienda está preparando su catálogo."
            : "No pudimos cargar este producto."}
        </h1>
        <Link className="dark-button" href="/">VOLVER AL INICIO</Link>
      </section>
    );
  }
  const catalog = await getPublishedProducts();
  return (
    <ProductPage
      product={result.product}
      relatedProducts={catalog.status === "ready" ? catalog.products : []}
    />
  );
}
