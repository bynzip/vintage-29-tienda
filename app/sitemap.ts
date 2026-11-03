import type { MetadataRoute } from "next";
import { getPublishedProducts } from "@/lib/catalog/products";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return [];
  const catalog = await getPublishedProducts();
  return [
    { url: base },
    ...(catalog.status === "ready"
      ? catalog.products.map((p) => ({ url: `${base}/products/${p.slug}` }))
      : []),
  ];
}
