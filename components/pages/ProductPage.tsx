"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { findProduct, productImage, withWidth } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import { useStorefront } from "@/components/StorefrontLayout";

const DETAIL_WIDTH = 1100;

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { data, isLoading } = useCatalog();
  const product = findProduct(data?.products ?? [], slug);
  const { addToBag } = useStorefront();
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setAdded(false);
  }, [slug]);

  if (isLoading) {
    return (
      <section className="product-missing">
        <h1>Cargando producto…</h1>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="product-missing">
        <h1>Este producto ya no está disponible.</h1>
        <Link className="dark-button" href="/catalogo">
          VER CATÁLOGO <ArrowRight size={15} />
        </Link>
      </section>
    );
  }

  const images = product.images.map((image) => image.url);
  const gallery = images.length ? images : [productImage(product)];
  const current = Math.min(activeImage, gallery.length - 1);
  const galleryImage = gallery[current];
  const alternateImage = gallery[(current + 1) % gallery.length];
  const others = (data?.products ?? [])
    .filter((item) => item.slug !== product.slug)
    .slice(0, 3);

  const handleAddToBag = () => {
    addToBag(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2400);
  };

  return (
    <section className="product-detail-page">
      <nav className="product-breadcrumb" aria-label="Ruta de navegación">
        <Link href="/">INICIO</Link>
        <ChevronRight size={12} />
        <Link href="/catalogo">CATÁLOGO</Link>
        <ChevronRight size={12} />
        <span>{product.name}</span>
      </nav>
      <div className="product-detail-layout">
        <div className="detail-thumbnails" aria-label="Galería del producto">
          {gallery.map((image, index) => (
            <button
              className={`detail-thumbnail${current === index ? " is-active" : ""}`}
              key={`${image}-${index}`}
              aria-label={`Ver imagen ${index + 1}`}
              aria-pressed={current === index}
              onClick={() => setActiveImage(index)}
            >
              <img src={withWidth(image, 200)} alt="" />
            </button>
          ))}
        </div>
        <div className="detail-gallery">
          <div className="detail-photo detail-photo-primary">
            <img src={withWidth(galleryImage, DETAIL_WIDTH, 80)} alt={product.name} />
          </div>
          <div className="detail-photo detail-photo-secondary">
            <img
              src={withWidth(alternateImage, DETAIL_WIDTH, 80)}
              alt={`${product.name}, otro look`}
            />
          </div>
          <span className="detail-image-count">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(gallery.length).padStart(2, "0")}
          </span>
        </div>
        <aside className="product-detail-info">
          <span className="detail-kicker">DEPT. DE COSAS BUENAS</span>
          <h1>{product.name}</h1>
          <p className="detail-price">Precio por confirmar</p>
          <p className="detail-stock-note">
            Talles y precios disponibles muy pronto. Añádelo a tu bolsa y
            guárdalo en favoritos.
          </p>
          <button className="detail-add-button" onClick={handleAddToBag}>
            {added ? "AÑADIDO A LA BOLSA" : "AÑADIR A LA BOLSA"}
            <ArrowRight size={16} />
          </button>
          <p className="detail-shipping">
            Envío a todo el Perú · Devoluciones fáciles
          </p>
          <div className="detail-accordions">
            <details open>
              <summary>DESCRIPCIÓN</summary>
              <p>
                Una pieza fácil para repetir una y otra vez. Combínala con tus
                prendas favoritas y crea un look totalmente tuyo.
              </p>
            </details>
            <details>
              <summary>CUIDADOS</summary>
              <p>
                Lavar a mano o en ciclo delicado con agua fría. No usar
                secadora. Planchar a baja temperatura.
              </p>
            </details>
            <details>
              <summary>ENVÍO</summary>
              <p>
                Envío estándar a todo el Perú. Las opciones y plazos se muestran
                al finalizar la compra.
              </p>
            </details>
          </div>
        </aside>
      </div>
      {others.length > 0 && (
        <section className="complete-look">
          <div className="complete-look-heading">
            <span className="eyebrow">MÁS PARA TU ROTACIÓN</span>
            <h2>Completa el look</h2>
          </div>
          <div className="complete-look-grid">
            {others.map((item) => (
              <Link
                href={`/products/${item.slug}`}
                className="complete-look-card"
                key={item.slug}
              >
                <img
                  src={withWidth(productImage(item), 300)}
                  alt={item.name}
                  loading="lazy"
                />
                <span>{item.name}</span>
                <strong>{item.images.length} fotos</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
