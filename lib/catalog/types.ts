export type HeroImage = {
  url: string;
  order: number;
  href?: string;
  mediaType?: "image" | "video";
};

export type CatalogImage = {
  url: string;
  order: number;
  lifestyle: boolean;
  alt: string | null;
  colorId?: string | null;
  colorName?: string | null;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription?: string | null;
  category: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  parentCategoryId?: string | null;
  gender?: "female" | "male" | "unisex" | null;
  fit?: string | null;
  material?: string | null;
  careInstructions?: string | null;
  countryOfOrigin?: string | null;
  colors?: Array<{ id?: string; name: string; hexColor: string | null }>;
  sizes?: string[];
  sizeOptions?: Array<{ id: string; name: string }>;
  price: number | null;
  available: boolean;
  status?: "draft" | "published" | "archived";
  cover: string | null;
  images: CatalogImage[];
  variants: Array<{
    id: string;
    colorId: string | null;
    sizeId: string | null;
    sku: string | null;
    name: string | null;
    price: number | null;
    available: boolean;
  }>;
};

export type CatalogResult =
  | { status: "ready"; products: CatalogProduct[] }
  | { status: "not-configured" | "error"; products: [] };
