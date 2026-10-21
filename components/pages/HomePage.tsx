import { getPublishedProducts } from "@/lib/catalog/products";
import { getHomeData } from "@/lib/catalog/home";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import Banner from "@/components/catalog/Banner";
import CouponBanner from "@/components/catalog/CouponBanner";
import HeroCarousel from "@/components/catalog/HeroCarousel";
import LifestyleCarousel from "@/components/catalog/LifestyleCarousel";
import ProductCarousel from "@/components/catalog/ProductCarousel";
import ProductGrid from "@/components/catalog/ProductGrid";
import SocialMediaSection from "@/components/catalog/SocialMediaSection";
import CampaignMosaic from "@/components/catalog/CampaignMosaic";

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
        <div className="home-top-coupon-wrap">
          <CouponBanner
            image={home.couponBanner.imageUrl}
            href={home.couponBanner.href}
            ariaLabel={home.couponBanner.ariaLabel}
          />
        </div>
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

        {home.mosaicMiniBanner && home.mosaicMiniBanner.imageUrl && (
          <div className="home-mosaic-banner-wrap">
            <CouponBanner
              image={home.mosaicMiniBanner.imageUrl}
              href={home.mosaicMiniBanner.href}
              ariaLabel={home.mosaicMiniBanner.ariaLabel}
            />
          </div>
        )}

        {home.mosaic?.isActive && home.mosaic.items.length === 4 ? (
          <CampaignMosaic items={home.mosaic.items} />
        ) : null}

        {home.socialSection?.isActive ? (
          <SocialMediaSection
            title={home.socialSection.title}
            subtitle={home.socialSection.subtitle}
            buttonLabel={home.socialSection.buttonLabel}
            socialUrl={home.socialSection.socialUrl}
            videoSrc={home.socialSection.videoSrc}
          />
        ) : null}

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
