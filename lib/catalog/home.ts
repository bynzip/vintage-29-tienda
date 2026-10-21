import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabasePublicClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { HomeSlideRow, HomeBannerRow } from "@/lib/supabase/database.types";
import type { HeroImage } from "@/lib/catalog/types";
import type { CampaignMosaicItem } from "@/components/catalog/CampaignMosaic";
import productSource from "@/productos.json";

export type HomeMosaicData = {
  isActive: boolean;
  items: CampaignMosaicItem[];
};

export type HomeData = {
  slides: HeroImage[];
  couponBanner: {
    imageUrl: string;
    href: string;
    ariaLabel?: string;
  } | null;
  mosaicMiniBanner: {
    imageUrl: string;
    href: string;
    ariaLabel?: string;
  } | null;
  mosaic: HomeMosaicData | null;
  banner: {
    title: string;
    subtitle?: string | null;
    buttonLabel: string;
    href: string;
    imageUrl: string;
  } | null;
  socialSection: {
    title: string;
    subtitle: string;
    buttonLabel: string;
    socialUrl: string;
    videoSrc: string | null;
    isActive: boolean;
  } | null;
};

const fallbackSlides: HeroImage[] = productSource.portada.map((image) => ({
  url: `/${image.ruta}`,
  order: image.orden,
  href: "href" in image && typeof image.href === "string" ? image.href : undefined,
}));

const fallbackBanner = {
  title: "Blouses Collection",
  subtitle: "Descubre nuestra selección especial de temporada",
  buttonLabel: "Comprar ahora",
  href: "#productos",
  imageUrl: fallbackSlides[1]?.url ?? fallbackSlides[0]?.url ?? "",
};

async function readHomeData(): Promise<HomeData> {
  if (!hasSupabaseConfig()) {
    return {
      slides: fallbackSlides,
      banner: fallbackBanner,
      couponBanner: null,
      mosaicMiniBanner: null,
      socialSection: null,
      mosaic: null,
    };
  }
  const supabase = createSupabasePublicClient() as any;
  if (!supabase) {
    return {
      slides: fallbackSlides,
      banner: fallbackBanner,
      couponBanner: null,
      mosaicMiniBanner: null,
      socialSection: null,
      mosaic: null,
    };
  }

  const [slidesResult, bannerResult, couponResult, mosaicMiniResult, socialResult, mosaicResult] = await Promise.all([
    supabase
      .from("home_slides")
      .select("id, title, subtitle, media_type, media_url, button_label, href, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("home_banners")
      .select("id, title, subtitle, button_label, href, image_url")
      .eq("identifier", "main_promo")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("home_banners")
      .select("id, title, subtitle, button_label, href, image_url")
      .eq("identifier", "coupon_banner")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("home_banners")
      .select("id, title, subtitle, button_label, href, image_url, is_active")
      .eq("identifier", "mosaic_mini_banner")
      .maybeSingle(),
    supabase
      .from("home_banners")
      .select("id, title, subtitle, button_label, href, image_url, is_active")
      .eq("identifier", "social_section")
      .maybeSingle(),
    supabase
      .from("home_banners")
      .select("id, identifier, title, subtitle, button_label, href, image_url, is_active")
      .in("identifier", ["mosaic_tile_1", "mosaic_tile_2", "mosaic_tile_3", "mosaic_tile_4"])
      .order("identifier", { ascending: true }),
  ]);

  const slidesData = (slidesResult.data ?? []) as HomeSlideRow[];
  const bannerData = bannerResult.data as HomeBannerRow | null;
  const couponData = couponResult.data as HomeBannerRow | null;
  const mosaicMiniData = mosaicMiniResult.data as HomeBannerRow | null;
  const socialData = socialResult.data as HomeBannerRow | null;
  const mosaicRows = (mosaicResult.data ?? []) as HomeBannerRow[];

  const slides: HeroImage[] = slidesData.map((item) => {
    const isVideo =
      item.media_type === "video" ||
      /\.(mp4|mov|webm)(\?.*)?$/i.test(item.media_url);
    return {
      url: item.media_url,
      order: item.sort_order,
      mediaType: isVideo ? "video" : "image",
      href: item.href || undefined,
    };
  });

  const banner = bannerData
    ? {
        title: bannerData.title,
        subtitle: bannerData.subtitle,
        buttonLabel: bannerData.button_label,
        href: bannerData.href,
        imageUrl: bannerData.image_url,
      }
    : null;

  const couponBanner = couponData && couponData.image_url
    ? {
        imageUrl: couponData.image_url,
        href: couponData.href || "#productos",
        ariaLabel: couponData.title || "Ver promoción",
      }
    : null;

  const mosaicMiniBanner = mosaicMiniData && mosaicMiniData.is_active && mosaicMiniData.image_url
    ? {
        imageUrl: mosaicMiniData.image_url,
        href: mosaicMiniData.href || "#productos",
        ariaLabel: mosaicMiniData.title || "Ver promoción",
      }
    : null;

  const socialSection =
    socialData && socialData.is_active && socialData.image_url
      ? {
          title: socialData.title,
          subtitle: socialData.subtitle ?? "",
          buttonLabel: socialData.button_label || "VER TIKTOK",
          socialUrl: socialData.href || "https://www.tiktok.com",
          videoSrc: socialData.image_url,
          isActive: true,
        }
      : null;

  const mosaic: HomeMosaicData | null =
    mosaicRows.length === 4 && mosaicRows.every((r) => r.is_active && r.image_url)
      ? {
          isActive: true,
          items: mosaicRows.map((row) => ({
            image: row.image_url,
            imageAlt: row.title || undefined,
            buttonLabel: row.button_label || "VER COLECCIÓN",
            href: row.href || "#productos",
          })),
        }
      : null;

  return { slides, banner, couponBanner, mosaicMiniBanner, socialSection, mosaic };
}

export const getHomeData = unstable_cache(readHomeData, ["home-data"], {
  revalidate: 60,
  tags: ["home"],
});
