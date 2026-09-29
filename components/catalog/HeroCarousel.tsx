"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { withWidth } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import ProgressiveImage from "@/components/catalog/ProgressiveImage";

const HERO_WIDTH = 2560;
const HERO_QUALITY = 90;
const PREVIEW_WIDTH = 24;
const PREVIEW_QUALITY = 20;
const INTERVAL_MS = 13000;
const TRANSITION_MS = 950;
const SNAP_DELAY_MS = 40;

export default function HeroCarousel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useCatalog();
  const hero = data?.hero ?? [];
  const count = hero.length;

  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [ready, setReady] = useState(false);

  // Avance automático: siempre hacia adelante. El clon de la primera imagen
  // al final de la pista hace que el loop se sienta continuo.
  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => Math.min(current + 1, count));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count]);

  // Al aterrizar en el clon saltamos a la posición real sin animación.
  useEffect(() => {
    if (index !== count) return;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, TRANSITION_MS + 60);
    return () => window.clearTimeout(timer);
  }, [index, count]);

  // Reactiva la animación justo después del salto.
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

  const slides = count > 1 ? [...hero, hero[0]] : hero;
  const activeDot = count ? index % count : 0;
  const transform = count ? `translateX(-${index * 100}%)` : undefined;

  return (
    <section className={`hero${ready ? " hero--ready" : ""}`} aria-label="Nueva colección">
      <div
        className="hero-track"
        style={{ transform, transition: animate ? undefined : "none" }}
      >
        {slides.map((image, position) => (
          <div
            className="hero-slide"
            key={`${image.url}-${position}`}
            aria-hidden={position !== index}
          >
            <ProgressiveImage
              src={withWidth(image.url, HERO_WIDTH, HERO_QUALITY)}
              previewSrc={withWidth(image.url, PREVIEW_WIDTH, PREVIEW_QUALITY)}
              eager={position === 0}
              onReady={position === 0 ? () => setReady(true) : undefined}
              alt=""
            />
          </div>
        ))}
      </div>
      <div className="hero-shade" />
      {children}

      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-arrow hero-arrow--prev"
            aria-label="Imagen anterior"
            onClick={goPrev}
          >
            <ChevronLeft size={26} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="hero-arrow hero-arrow--next"
            aria-label="Imagen siguiente"
            onClick={goNext}
          >
            <ChevronRight size={26} strokeWidth={1.5} />
          </button>
          <div className="hero-dots" aria-label="Seleccionar imagen">
            {hero.map((image, dot) => (
              <button
                key={image.url}
                type="button"
                aria-label={`Imagen ${dot + 1} de ${count}`}
                aria-current={dot === activeDot ? "true" : undefined}
                className={`hero-dot${dot === activeDot ? " is-active" : ""}`}
                onClick={() => goTo(dot)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
