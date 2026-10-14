"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/types";
import Image from "next/image";

const VISIBLE = 4;
const INTERVAL_MS = 6000;
const TRANSITION_MS = 700;
const SNAP_DELAY_MS = 40;

type Slide = { slug: string; image: string; subcategory: string | null };

function toSlides(products: CatalogProduct[]): Slide[] {
  const withLifestyle = products
    .map((product) => {
      const lifestyle = product.images.find((image) => image.lifestyle);
      if (!lifestyle) return null;
      return { slug: product.slug, image: lifestyle.url, subcategory: product.category };
    })
    .filter((slide): slide is Slide => slide !== null);

  if (withLifestyle.length > 0) return withLifestyle;

  return products
    .slice(0, 8)
    .map((product) => {
      const img = product.images[0];
      if (!img) return null;
      return { slug: product.slug, image: img.url, subcategory: product.category };
    })
    .filter((slide): slide is Slide => slide !== null);
}

export default function LifestyleCarousel({ products }: { products: CatalogProduct[] }) {
  const items = toSlides(products);
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [visibleSlides, setVisibleSlides] = useState(VISIBLE);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const updateVisibleSlides = () => setVisibleSlides(mobileQuery.matches ? 2 : VISIBLE);
    updateVisibleSlides();
    mobileQuery.addEventListener("change", updateVisibleSlides);
    return () => mobileQuery.removeEventListener("change", updateVisibleSlides);
  }, []);

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => Math.min(current + 1, count));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => {
    if (index !== count) return;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, TRANSITION_MS + 60);
    return () => window.clearTimeout(timer);
  }, [index, count]);

  useEffect(() => {
    if (animate) return;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [animate]);

  const goTo = useCallback(
    (target: number) => {
      if (count < 2) return;
      if (index === count) {
        setAnimate(false);
        setIndex(0);
        window.setTimeout(() => {
          setAnimate(true);
          setIndex(target);
        }, SNAP_DELAY_MS);
        return;
      }
      setAnimate(true);
      setIndex(target);
    },
    [count, index],
  );

  const goNext = useCallback(() => {
    if (count < 2) return;
    if (index === count) {
      setAnimate(false);
      setIndex(0);
      window.setTimeout(() => {
        setAnimate(true);
        setIndex(1);
      }, SNAP_DELAY_MS);
      return;
    }
    setAnimate(true);
    setIndex(index + 1);
  }, [count, index]);

  const goPrev = useCallback(() => {
    if (count < 2) return;
    if (index === 0) {
      setAnimate(false);
      setIndex(count);
      window.setTimeout(() => {
        setAnimate(true);
        setIndex(count - 1);
      }, SNAP_DELAY_MS);
      return;
    }
    setAnimate(true);
    setIndex(index - 1);
  }, [count, index]);

  if (!count) return null;

  const slides =
    count > 1 ? [...items, ...items.slice(0, Math.min(visibleSlides, count))] : items;
  const transform = `translateX(calc(-${100 / visibleSlides}% * ${index}))`;

  return (
    <section className="lifestyle-section" aria-label="Consigue tu estilo">
      <div className="page-gutter">
        <div className="section-heading lifestyle-heading">
          <div>
            <span className="eyebrow">INSPIRACIÓN & OUTFITS</span>
            <h2>
              Consigue tu estilo<span className="coral-dot">.</span>
            </h2>
          </div>
        </div>
      </div>
      <div className="lifestyle-viewport">
        <div
          className="lifestyle-track"
          style={{ transform, transition: animate ? undefined : "none" }}
        >
          {slides.map((slide, position) => (
            <button
              type="button"
              key={`${slide.slug}-${position}`}
              className="lifestyle-slide"
              aria-label={`Seleccionar ${slide.slug}`}
              onClick={() => goTo(position % count)}
            >
              <Image
                src={slide.image}
                fill
                quality={90}
                sizes="(max-width: 640px) 50vw, 25vw"
                loading={position < 2 ? "eager" : "lazy"}
                alt=""
              />
              {slide.subcategory && (
                <span className="lifestyle-subcategory">{slide.subcategory}</span>
              )}
            </button>
          ))}
        </div>

        {count > visibleSlides && (
          <>
            <button
              type="button"
              className="lifestyle-arrow lifestyle-arrow--prev"
              aria-label="Anterior"
              onClick={goPrev}
            >
              <ChevronLeft size={22} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="lifestyle-arrow lifestyle-arrow--next"
              aria-label="Siguiente"
              onClick={goNext}
            >
              <ChevronRight size={22} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
