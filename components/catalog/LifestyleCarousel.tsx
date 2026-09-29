"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { withWidth, type CatalogProduct } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import ProgressiveImage from "@/components/catalog/ProgressiveImage";

const SLIDE_WIDTH = 640;
const SLIDE_QUALITY = 68;
const PREVIEW_WIDTH = 24;
const PREVIEW_QUALITY = 20;
const VISIBLE = 4;
const STEP = 100 / VISIBLE;
const INTERVAL_MS = 6000;
const TRANSITION_MS = 700;
const SNAP_DELAY_MS = 40;

type Slide = { slug: string; image: string };

function toSlides(products: CatalogProduct[]): Slide[] {
  return products
    .map((product) => {
      const lifestyle = product.images.find((image) => image.lifestyle);
      if (!lifestyle) return null;
      return { slug: product.slug, image: lifestyle.url };
    })
    .filter((slide): slide is Slide => slide !== null);
}

export default function LifestyleCarousel() {
  const { data } = useCatalog();
  const items = data ? toSlides(data.products) : [];
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

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
    count > 1 ? [...items, ...items.slice(0, Math.min(VISIBLE, count))] : items;
  const transform = `translateX(calc(-${STEP}% * ${index}))`;

  return (
    <section className="lifestyle-section" aria-label="Colección en uso">
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
              <ProgressiveImage
                src={withWidth(slide.image, SLIDE_WIDTH, SLIDE_QUALITY)}
                previewSrc={withWidth(slide.image, PREVIEW_WIDTH, PREVIEW_QUALITY)}
                eager={position < VISIBLE}
                alt=""
              />
            </button>
          ))}
        </div>

        {count > VISIBLE && (
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
