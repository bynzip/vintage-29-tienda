import "server-only";

import { unstable_cache } from "next/cache";
import { createSupabasePublicClient, hasSupabaseConfig } from "@/lib/supabase/server";
import type { HomeSlideRow, HomeBannerRow } from "@/lib/supabase/database.types";
import type { HeroImage } from "@/lib/catalog/types";
import productSource from "@/productos.json";

export type HomeData = {
  slides: HeroImage[];
  couponBanner: {
    imageUrl: string;
    href: string;
    ariaLabel?: string;
  } | null;
  banner: {
    title: string;
    subtitle?: string | null;
    buttonLabel: string;
    href: string;
    imageUrl: string;
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
    return { slides: fallbackSlides, banner: fallbackBanner, couponBanner: null };
  }
  const supabase = createSupabasePublicClient() as any;
  if (!supabase) {
    return { slides: fallbackSlides, banner: fallbackBanner, couponBanner: null };
  }

  const [slidesResult, bannerResult, couponResult] = await Promise.all([
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
  ]);

  const slidesData = (slidesResult.data ?? []) as HomeSlideRow[];
  const bannerData = bannerResult.data as HomeBannerRow | null;
  const couponData = couponResult.data as HomeBannerRow | null;

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

  return { slides, banner, couponBanner };
}

export const getHomeData = unstable_cache(readHomeData, ["home-data"], {
  revalidate: 60,
  tags: ["home"],
});
