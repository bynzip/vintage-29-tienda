// Public domain aliases. database.generated.ts is generated from PostgreSQL.
import type { Database } from "./database.generated";
export type { Database, Json } from "./database.generated";
type Tables = Database["public"]["Tables"];
export type ProductStatus = "draft" | "published" | "archived";
export type Gender = "female" | "male" | "unisex";
export type ProductRow = Tables["products"]["Row"];
export type ProductMediaRow = Tables["product_media"]["Row"];
export type ProductVariantRow = Tables["product_variants"]["Row"];
export type VariantPriceRow = Tables["variant_prices"]["Row"];
export type InventoryLevelRow = Tables["inventory_levels"]["Row"];
export type CategoryRow = Tables["categories"]["Row"];
export type CatalogValueRow = Tables["sizes"]["Row"];
export type ColorRow = Tables["colors"]["Row"];
export type ProductColorRow = Tables["product_colors"]["Row"];
export type ProductSizeRow = Tables["product_sizes"]["Row"];
export type PriceListRow = Tables["price_lists"]["Row"];
export type WarehouseRow = Tables["warehouses"]["Row"];
export type HomeSlideRow = Omit<Tables["home_slides"]["Row"], "media_type"> & {
  media_type: "image" | "video";
};
export type HomeBannerRow = Tables["home_banners"]["Row"];
export type MediaAssetRow = Tables["media_assets"]["Row"];
export type ViewMediaUsageRow = Omit<MediaAssetRow, "deleting_at"> & {
  usage_count: number;
  used_in_products: string[];
};
