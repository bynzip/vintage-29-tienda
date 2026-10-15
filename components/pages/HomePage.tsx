import { getPublishedProducts } from "@/lib/catalog/products";
import { getHomeData } from "@/lib/catalog/home";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import Banner from "@/components/catalog/Banner";
import CouponBanner from "@/components/catalog/CouponBanner";
import HeroCarousel from "@/components/catalog/HeroCarousel";
import LifestyleCarousel from "@/components/catalog/LifestyleCarousel";
import ProductCarousel from "@/components/catalog/ProductCarousel";
import ProductGrid from "@/components/catalog/ProductGrid";

export default async function HomePage() {
  const [catalog, home] = await Promise.all([
    getPublishedProducts(),
    getHomeData(),
  ]);

  return (
    <div className="home-page">
      {home.slides.length > 0 && (
        <div className="hero-scroll-stage">
          <HeroCarousel hero={home.slides} />
        </div>
      )}

      {home.couponBanner && home.couponBanner.imageUrl && (
        <CouponBanner
          image={home.couponBanner.imageUrl}
          href={home.couponBanner.href}
          ariaLabel={home.couponBanner.ariaLabel}
        />
      )}

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

        {home.banner && home.banner.imageUrl && (
          <Banner
            image={home.banner.imageUrl}
            title={home.banner.title}
            subtitle={home.banner.subtitle}
            buttonLabel={home.banner.buttonLabel}
            href={home.banner.href}
          />
        )}
      </div>
    </div>
  );
}
