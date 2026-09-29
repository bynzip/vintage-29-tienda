export type CatalogImage = {
  url: string;
  order: number;
  lifestyle: boolean;
};

export type CatalogVariant = {
  sku: string;
  size: string;
  color: string;
  available: number;
};

export type CatalogProduct = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  cover: string | null;
  images: CatalogImage[];
  variants?: CatalogVariant[];
};

export type HeroImage = {
  url: string;
  order: number;
};

export type CatalogData = {
  hero: HeroImage[];
  products: CatalogProduct[];
};

/**
 * Única puerta de entrada al catálogo.
 * Sirve los productos publicados desde Supabase (/api/catalog).
 * Cuando exista la API REST definitiva, cambia SOLO este endpoint: el resto
 * de la app no se entera.
 */
const CATALOG_ENDPOINT =
  process.env.NEXT_PUBLIC_CATALOG_ENDPOINT ?? "/api/catalog";

export async function fetchCatalogData(): Promise<CatalogData> {
  const response = await fetch(CATALOG_ENDPOINT, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catálogo (HTTP ${response.status})`);
  }
  const data = (await response.json()) as Partial<CatalogData>;
  return {
    hero: data.hero ?? [],
    products: data.products ?? [],
  };
}

export function withWidth(url: string, width: number, quality?: number): string {
  const params = new URLSearchParams({ w: String(width) });
  if (quality) params.set("q", String(quality));
  return `${url}?${params.toString()}`;
}

export function productImage(product: CatalogProduct): string {
  return product.cover ?? product.images[0]?.url ?? "";
}

export function findProduct(
  products: CatalogProduct[],
  slug?: string,
): CatalogProduct | undefined {
  if (!slug) return undefined;
  return products.find((product) => product.slug === slug);
}

export function searchProducts(
  products: CatalogProduct[],
  term: string,
): CatalogProduct[] {
  const query = term.trim().toLowerCase();
  if (!query) return [];
  return products.filter((product) =>
    product.name.toLowerCase().includes(query),
  );
}
