"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { CatalogProduct } from "@/lib/catalog/types";

const CAROUSEL_IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 900px) 33vw, 20vw";

export default function ProductCarousel({ products }: { products: CatalogProduct[] }) {
  const visibleProducts = products;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(visibleProducts.length > 1);

  const updateArrows = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setCanScrollPrevious(viewport.scrollLeft > 1);
    setCanScrollNext(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateArrows();
    viewport.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateArrows)
      : null;
    observer?.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      observer?.disconnect();
    };
  }, [updateArrows, visibleProducts.length]);

  const scrollPage = (direction: -1 | 1) => {
    viewportRef.current?.scrollBy({
      left: direction * (viewportRef.current?.clientWidth ?? 0),
      behavior: "smooth",
    });
  };

  if (!visibleProducts.length) return null;

  return (
    <div className="product-carousel-shell">
      <div
        className="product-carousel-viewport"
        ref={viewportRef}
        role="region"
        aria-label="Carrusel de productos"
        tabIndex={0}
      >
        <div className="product-carousel-track">
          {visibleProducts.map((product) => (
            <div className="product-carousel-item" key={product.id}>
              <ProductCard product={product} imageSizes={CAROUSEL_IMAGE_SIZES} />
            </div>
          ))}
        </div>
      </div>

      {canScrollPrevious && (
        <button
          className="product-carousel-arrow product-carousel-arrow--previous"
          type="button"
          aria-label="Ver productos anteriores"
          onClick={() => scrollPage(-1)}
        >
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>
      )}
      {canScrollNext && (
        <button
          className="product-carousel-arrow product-carousel-arrow--next"
          type="button"
          aria-label="Ver más productos"
          onClick={() => scrollPage(1)}
        >
          <ChevronRight size={20} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}
