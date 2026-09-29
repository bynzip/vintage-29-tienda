"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { withWidth } from "@/lib/api/catalog";
import { useCatalog } from "@/hooks/use-catalog";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import HeroCarousel from "@/components/catalog/HeroCarousel";
import LifestyleCarousel from "@/components/catalog/LifestyleCarousel";

export default function HomePage() {
  const [subscribed, setSubscribed] = useState(false);
  const { data } = useCatalog();

  const campaignImage = useMemo(() => {
    const lifestyleImages = (data?.products ?? []).flatMap((product) =>
      product.images.filter((image) => image.lifestyle).map((image) => image.url),
    );
    if (!lifestyleImages.length) return null;
    return lifestyleImages[Math.floor(Math.random() * lifestyleImages.length)];
  }, [data]);

  return (
    <>
      <HeroCarousel>
        <div className="hero-content">
          <span className="eyebrow hero-eyebrow">ALGO MUY BUENO</span>
          <h1>
            Vístete
            <br />
            con actitud.
          </h1>
          <p>Tu próximo look favorito está por aquí.</p>
          <Link className="light-button" href="/collections/new-arrivals">
            VER NOVEDADES <ArrowRight size={15} />
          </Link>
        </div>
      </HeroCarousel>

      <LifestyleCarousel />

      <section className="arrivals-section page-gutter" id="new-arrivals">
        <div className="section-heading arrivals-heading">
          <div>
            <span className="eyebrow">FRESCO DEL DEPT. DE COSAS BUENAS</span>
            <h2>
              Recién llegado<span className="coral-dot">.</span>
            </h2>
          </div>
          <Link className="text-link" href="/collections/new-arrivals">
            VER TODO LO NUEVO <ArrowRight size={15} />
          </Link>
        </div>
        <CatalogGrid />
        <Link
          className="outline-button arrivals-cta"
          href="/collections/new-arrivals"
        >
          VER NOVEDADES <ArrowRight size={15} />
        </Link>
      </section>

      <section className="campaign-section">
        <div className="campaign-image">
          {campaignImage && (
            <img
              src={withWidth(campaignImage, 1400, 80)}
              alt="Look de la colección"
              loading="lazy"
            />
          )}
        </div>
        <div className="campaign-copy">
          <span className="eyebrow">EL SOL ESTÁ FUERA. NOSOTROS TAMBIÉN.</span>
          <h2>
            En algún lugar
            <br />
            entre aquí
            <br />
            y <em>todas partes.</em>
          </h2>
          <p>Prendas fáciles para donde te lleve el día.</p>
          <Link className="dark-button" href="/collections/getaway">
            VER LA EDICIÓN ESCAPADA <ArrowRight size={15} />
          </Link>
          <span className="campaign-scribble">fuera de la oficina</span>
        </div>
      </section>

      <section className="signup-section page-gutter">
        <span className="eyebrow">LO BUENO LLEGA A QUIEN SE SUSCRIBE</span>
        <h2>
          Algo rico
          <br />
          para tu correo.
        </h2>
        <p>Primicias, nuevos lanzamientos y 15% en tu primer pedido.</p>
        {subscribed ? (
          <div className="signup-success" role="status">
            Gracias por tu interés. El envío del newsletter aún no está
            conectado en esta demo.
          </div>
        ) : (
          <form
            className="signup-form"
            onSubmit={(event) => {
              event.preventDefault();
              setSubscribed(true);
            }}
          >
            <input
              required
              type="email"
              placeholder="Tu correo electrónico"
              aria-label="Tu correo electrónico"
            />
            <button type="submit" aria-label="Suscribirme">
              <ArrowRight size={20} />
            </button>
          </form>
        )}
        <span className="signup-fine-print">
          Al suscribirte, aceptas recibir correos de Vintage 29.
        </span>
      </section>
    </>
  );
}
