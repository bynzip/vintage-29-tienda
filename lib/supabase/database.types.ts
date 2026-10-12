export type ProductStatus = "draft" | "published" | "archived";
export type Gender = "female" | "male" | "unisex";

export type ProductRow = {
  id: string;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  gender: Gender | null;
  age_group: "newborn" | "infant" | "kids" | "adult";
  fit_id: string | null;
  material_summary: string | null;
  care_instructions: string | null;
  country_of_origin: string | null;
  status: ProductStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductMediaRow = {
  id: string;
  product_id: string;
  asset_path: string;
  media_type: "image" | "video";
  alt_text: string | null;
  position: number;
  is_primary: boolean;
  is_lifestyle: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImageRow = ProductMediaRow;

export type ProductOptionRow = {
  id: string;
  product_id: string;
  code: string;
  name: string;
  position: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

export type OptionValueRow = {
  id: string;
  option_id: string;
  value: string;
  slug: string;
  position: number;
  hex_color: string | null;
  swatch_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  color_id: string | null;
  size_id: string | null;
  sku: string | null;
  barcode: string | null;
  variant_name: string | null;
  combination_key: string;
  weight_grams: number | null;
  requires_shipping: boolean;
  track_inventory: boolean;
  allow_backorder: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type VariantOptionValueRow = {
  variant_id: string;
  option_value_id: string;
};

export type VariantPriceRow = {
  id: string;
  variant_id: string;
  price_list_id: string;
  amount_cents: number;
  compare_at_amount_cents: number | null;
  cost_amount_cents: number | null;
  tax_included: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventoryLevelRow = {
  variant_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
  incoming_quantity: number;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogValueRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ColorRow = CatalogValueRow & { hex_color: string | null };
export type ProductColorRow = { product_id: string; color_id: string; position: number };
export type ProductSizeRow = { product_id: string; size_id: string; position: number };

export type BrandRow = { id: string; name: string; slug: string; logo_path: string | null; is_active: boolean; created_at: string; updated_at: string };
export type PriceListRow = { id: string; name: string; currency: string; country_code: string; sales_channel: string; customer_group: string; is_active: boolean; created_at: string; updated_at: string };
export type WarehouseRow = { id: string; name: string; code: string; is_active: boolean; created_at: string; updated_at: string };

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type PublicTables = {
  admin_profiles: Table<{ user_id: string; role: "admin"; is_active: boolean; created_at: string; updated_at: string }>;
  brands: Table<BrandRow>;
  categories: Table<CategoryRow>;
  colors: Table<ColorRow>;
  sizes: Table<CatalogValueRow>;
  fits: Table<CatalogValueRow>;
  materials: Table<CatalogValueRow>;
  products: Table<ProductRow>;
  product_colors: Table<ProductColorRow>;
  product_sizes: Table<ProductSizeRow>;
  product_options: Table<ProductOptionRow>;
  option_values: Table<OptionValueRow>;
  product_variants: Table<ProductVariantRow>;
  variant_option_values: Table<VariantOptionValueRow>;
  attributes: Table<Record<string, unknown>>;
  attribute_values: Table<Record<string, unknown>>;
  product_attribute_values: Table<Record<string, unknown>>;
  variant_attribute_values: Table<Record<string, unknown>>;
  product_media: Table<ProductMediaRow>;
  variant_media: Table<Record<string, unknown>>;
  collections: Table<Record<string, unknown>>;
  collection_products: Table<Record<string, unknown>>;
  price_lists: Table<PriceListRow>;
  variant_prices: Table<VariantPriceRow>;
  warehouses: Table<WarehouseRow>;
  inventory_levels: Table<InventoryLevelRow>;
  inventory_movements: Table<Record<string, unknown>>;
  size_charts: Table<Record<string, unknown>>;
  size_chart_rows: Table<Record<string, unknown>>;
  size_measurements: Table<Record<string, unknown>>;
};

export type Database = {
  public: {
    Tables: PublicTables;
    Views: {
      public_variant_availability: {
        Row: { variant_id: string; is_available: boolean };
        Relationships: [];
      };
    };
    Functions: {
      is_active_admin: { Args: Record<string, never>; Returns: boolean };
      save_catalog_product: { Args: { p_payload: Record<string, unknown> }; Returns: string };
      delete_catalog_value: { Args: { p_kind: string; p_value_id: string }; Returns: number };
    };
    Enums: { product_status: ProductStatus };
    CompositeTypes: Record<string, never>;
  };
};
