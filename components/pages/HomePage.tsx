import productSource from "@/productos.json";
import { getPublishedProducts } from "@/lib/catalog/products";
import type { HeroImage } from "@/lib/catalog/types";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import Banner from "@/components/catalog/Banner";
import CampaignMosaic from "@/components/catalog/CampaignMosaic";
import CouponBanner from "@/components/catalog/CouponBanner";
import HeroCarousel from "@/components/catalog/HeroCarousel";
import HomeHeaderController from "@/components/catalog/HomeHeaderController";
import LifestyleCarousel from "@/components/catalog/LifestyleCarousel";
import ProductCarousel from "@/components/catalog/ProductCarousel";
import ProductGrid from "@/components/catalog/ProductGrid";
import SocialMediaSection from "@/components/catalog/SocialMediaSection";

const heroImages: HeroImage[] = productSource.portada.map((image) => ({
  url: `/${image.ruta}`,
  order: image.orden,
  href:
    "href" in image && typeof image.href === "string" ? image.href : undefined,
}));

function getPortadaImage(index: number) {
  return heroImages.length
    ? (heroImages[index % heroImages.length]?.url ?? "")
    : "";
}

export default async function HomePage() {
  const catalog = await getPublishedProducts();
  const bannerImage = heroImages[1]?.url ?? heroImages[0]?.url ?? "";

  return (
    <div className="home-page">
      <HomeHeaderController />
      <div className="hero-scroll-stage">
        <HeroCarousel hero={heroImages} />
      </div>

      <div className="home-overlay-content">
        {catalog.status === "ready" && catalog.products.length > 0 && (
          <LifestyleCarousel products={catalog.products} />
        )}

        <section className="arrivals-section" id="productos">
          <div className="page-gutter">
            <div className="section-heading arrivals-heading">
              <div>
                <span className="eyebrow">
                  FRESCO DEL DEPT. DE COSAS BUENAS
                </span>
                <h2>
                  Recién llegado<span className="coral-dot">.</span>
                </h2>
              </div>
            </div>
          </div>
          {catalog.status === "ready" && catalog.products.length > 0 ? (
            <ProductCarousel products={catalog.products} />
          ) : (
            <CatalogGrid catalog={catalog} />
          )}
        </section>

        {catalog.status === "ready" && catalog.products.length > 0 && (
          <section className="home-product-grid-section">
            <div className="page-gutter">
              <div className="section-heading arrivals-heading">
                <div>
                  <span className="eyebrow">DESCUBRE MÁS</span>
                  <h2>
                    Toda la colección<span className="coral-dot">.</span>
                  </h2>
                </div>
              </div>
            </div>
            <ProductGrid products={catalog.products} />
          </section>
        )}

        <br />
        <br />

        <Banner
          image={bannerImage}
          title="Blouses Collection"
          buttonLabel="Comprar ahora"
          href="#productos"
        />
      </div>
    </div>
  );
}
