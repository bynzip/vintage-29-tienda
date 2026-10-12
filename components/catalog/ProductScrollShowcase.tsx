"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { Ref } from "react";
import type { CatalogImage, CatalogProduct } from "@/lib/catalog/types";
import { getImagePreviewUrl } from "@/lib/catalog/images";

const EDGE_GUTTER_PX = 75;

const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(price);

function getPriceLabel(product: CatalogProduct) {
  const prices = [...new Set(
    product.variants
      .map((variant) => variant.price)
      .filter((price): price is number => price !== null && price > 0),
  )].sort((a, b) => a - b);

  if (prices.length > 1) return `Desde ${formatPrice(prices[0])}`;
  if (prices.length === 1) return formatPrice(prices[0]);
  if (product.price !== null && product.price > 0) return formatPrice(product.price);
  return null;
}

function ProductStripImage({
  image,
  eager,
  original,
  onSizeChange,
  frameRef,
}: {
  image: CatalogImage;
  eager: boolean;
  original: boolean;
  onSizeChange: () => void;
  frameRef?: Ref<HTMLDivElement>;
}) {
  const [aspectRatio, setAspectRatio] = useState(0.72);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={frameRef}
      className="product-strip-item product-strip-frame"
      style={{ aspectRatio }}
      aria-hidden={!original || undefined}
    >
      <img
        className={`product-strip-preview${loaded ? " is-hidden" : ""}`}
        src={getImagePreviewUrl(image.url, 256)}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        fetchPriority="low"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setAspectRatio(naturalWidth / naturalHeight);
          onSizeChange();
        }}
      />
      <Image
        className={`product-strip-full${loaded ? " is-loaded" : ""}`}
        src={image.url}
        alt={original ? image.alt || "" : ""}
        fill
        sizes={`${(aspectRatio * 100).toFixed(1)}svh`}
        quality={78}
        priority={eager}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setAspectRatio(naturalWidth / naturalHeight);
          setLoaded(true);
          onSizeChange();
        }}
      />
    </div>
  );
}

export default function ProductScrollShowcase({ product }: { product: CatalogProduct }) {
  const images = product.images.filter((image) => image.url);
  const repeatedImages = images.length > 1
    ? [...images, ...images, ...images]
    : images.length === 1
      ? [images[0], images[0], images[0]]
      : [];
  const slideCount = images.length;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const firstOriginalRef = useRef<HTMLDivElement>(null);
  const lastOriginalRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const mobileStartRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name ?? "");
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? "");
  const [isFavorite, setIsFavorite] = useState(false);

  const updateTrack = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const section = sectionRef.current;
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!section || !stage || !track) return;

      const firstOriginalOffset = firstOriginalRef.current?.offsetLeft ?? 0;
      const lastOriginalOffset = lastOriginalRef.current?.offsetLeft ?? firstOriginalOffset;
      const initialOffset = Math.max(0, firstOriginalOffset - EDGE_GUTTER_PX);
      const finalOffset = Math.max(initialOffset, lastOriginalOffset - EDGE_GUTTER_PX);
      const travelDistance = finalOffset - initialOffset;
      section.style.height = `${stage.offsetHeight + travelDistance}px`;

      if (window.matchMedia("(max-width: 900px)").matches) {
        track.style.transform = "none";
        const gallery = galleryRef.current;
        if (gallery?.clientWidth && slideCount) {
          const previousStart = mobileStartRef.current;
          if (previousStart === null || Math.abs(gallery.scrollLeft - previousStart) < 2) {
            gallery.scrollLeft = initialOffset;
          }
          mobileStartRef.current = initialOffset;
          const originalOffsets = Array.from(track.children)
            .slice(slideCount, slideCount * 2)
            .map((element) => (element as HTMLElement).offsetLeft);
          let visibleIndex = 0;
          originalOffsets.forEach((offset, index) => {
            if (offset <= gallery.scrollLeft + EDGE_GUTTER_PX) visibleIndex = index;
          });
          setActiveIndex(Math.max(0, Math.min(visibleIndex, slideCount - 1)));
        }
        return;
      }
      mobileStartRef.current = null;

      const stickyTop = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
      const distance = Math.max(
        0,
        Math.min(stickyTop - section.getBoundingClientRect().top, travelDistance),
      );
      const translation = initialOffset + distance;
      track.style.transform = `translate3d(-${translation}px, 0, 0)`;

      const originals = Array.from(track.children).slice(slideCount, slideCount * 2);
      let nextIndex = 0;
      originals.forEach((element, index) => {
        if ((element as HTMLElement).offsetLeft <= translation + EDGE_GUTTER_PX) nextIndex = index;
      });
      setActiveIndex((current) => current === nextIndex ? current : nextIndex);
    });
  }, [slideCount]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setActiveIndex(0);
    mobileStartRef.current = null;
    window.addEventListener("scroll", updateTrack, { passive: true });
    window.addEventListener("resize", updateTrack);
    const gallery = galleryRef.current;
    gallery?.addEventListener("scroll", updateTrack, { passive: true });

    const track = trackRef.current;
    const observer = track && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateTrack)
      : null;
    if (track && observer) observer.observe(track);

    updateTrack();
    return () => {
      window.removeEventListener("scroll", updateTrack);
      window.removeEventListener("resize", updateTrack);
      gallery?.removeEventListener("scroll", updateTrack);
      observer?.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [product.slug, updateTrack]);

  const priceLabel = getPriceLabel(product);
  const description = product.shortDescription || product.description;

  return (
    <section ref={sectionRef} className="product-scroll-section" aria-label={`Galería de ${product.name}`}>
      <div className="product-scroll-sticky" ref={stageRef}>
        <div
          className="product-scroll-gallery"
          ref={galleryRef}
          role="region"
          aria-roledescription="carrusel de imágenes"
          aria-label="Galería de imágenes del producto"
          tabIndex={0}
        >
          <div className="product-scroll-track" ref={trackRef}>
            {repeatedImages.map((image, index) => {
              const original = index >= slideCount && index < slideCount * 2;
              const originalIndex = index - slideCount;
              return (
                <ProductStripImage
                  key={`${image.url}-${index}`}
                  image={image}
                  eager={original && originalIndex < 2}
                  original={original}
                  onSizeChange={updateTrack}
                  frameRef={originalIndex === 0 ? firstOriginalRef : originalIndex === slideCount - 1 ? lastOriginalRef : undefined}
                />
              );
            })}
            {!slideCount && (
              <div className="product-scroll-placeholder" role="img" aria-label={`Imagen no disponible: ${product.name}`}>
                <span>IMAGEN NO DISPONIBLE</span>
              </div>
            )}
          </div>
          {slideCount > 1 && (
            <div
              className="product-scroll-pagination"
              role="img"
              aria-label={`Imagen ${activeIndex + 1} de ${slideCount}`}
            >
              <span
                className="product-scroll-pagination-track"
                aria-hidden="true"
                style={{ width: Math.min(26 * slideCount + 8 * (slideCount - 1), 220) }}
              >
                {images.map((image, index) => <i key={image.url} className={index === activeIndex ? "is-active" : ""} />)}
              </span>
            </div>
          )}
        </div>

        <aside className="product-purchase-card" aria-labelledby="product-title">
          <div className="product-purchase-heading">
            <div className="product-purchase-title">
              {product.category && <p className="product-purchase-kicker">{product.category}</p>}
              <h1 id="product-title">{product.name}</h1>
            </div>
            {priceLabel && <p className="product-purchase-price">{priceLabel}</p>}
          </div>
          {description && <p className="product-purchase-description">{description}</p>}

          {!!(product.colors?.length || product.sizes?.length) && (
            <div className={`product-option-grid${product.colors?.length && product.sizes?.length ? " has-two-groups" : ""}`}>
              {!!product.colors?.length && (
                <section className="product-option-group" aria-label="Colores disponibles">
                  <h2>COLOR: <span>{selectedColor}</span></h2>
                  <div className="product-choice-grid">
                    {product.colors.map((color) => (
                      <button
                        className={`product-choice-tile product-color-choice${selectedColor === color.name ? " is-selected" : ""}`}
                        key={color.name}
                        type="button"
                        title={color.name}
                        aria-label={`Seleccionar color ${color.name}`}
                        aria-pressed={selectedColor === color.name}
                        style={{ backgroundColor: color.hexColor ?? "#e9e6e2" }}
                        onClick={() => setSelectedColor(color.name)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {!!product.sizes?.length && (
                <section className="product-option-group" aria-label="Tallas disponibles">
                  <h2>TALLAS</h2>
                  <div className="product-choice-grid product-size-grid">
                    {product.sizes.map((size) => (
                      <button
                        className={`product-choice-tile product-size-choice${selectedSize === size ? " is-selected" : ""}`}
                        key={size}
                        type="button"
                        aria-label={`Seleccionar talla ${size}`}
                        aria-pressed={selectedSize === size}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="product-purchase-actions">
            <button className="product-add-to-cart" type="button">AGREGAR AL CARRITO</button>
            <button
              className={`product-favorite${isFavorite ? " is-active" : ""}`}
              type="button"
              aria-label={isFavorite ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
              aria-pressed={isFavorite}
              onClick={() => setIsFavorite((favorite) => !favorite)}
            >
              <Heart size={19} strokeWidth={1.7} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="product-shipping-info" aria-label="Opciones de recogida y envío">
            <p>Recogida en tienda <strong>GRATIS</strong></p>
            <p>Envío a domicilio estándar a partir de 35 € <strong>GRATIS</strong></p>
          </div>
          <div className="product-card-links">
            <a href="#product-details">Detalles del producto</a>
            <button type="button">Guía de tallas</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
