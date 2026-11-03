export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string;
          is_active: boolean;
          role: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      catalog_settings: {
        Row: {
          id: boolean;
          price_list_id: string;
          warehouse_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: boolean;
          price_list_id: string;
          warehouse_id: string;
        };
        Update: {
          id?: boolean;
          price_list_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_settings_price_list_id_fkey";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_settings_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      colors: {
        Row: {
          created_at: string;
          hex_color: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hex_color?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hex_color?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fits: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      home_banners: {
        Row: {
          button_label: string;
          created_at: string;
          href: string;
          id: string;
          identifier: string;
          image_url: string;
          is_active: boolean;
          subtitle: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          button_label?: string;
          created_at?: string;
          href?: string;
          id?: string;
          identifier: string;
          image_url: string;
          is_active?: boolean;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          button_label?: string;
          created_at?: string;
          href?: string;
          id?: string;
          identifier?: string;
          image_url?: string;
          is_active?: boolean;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      home_slides: {
        Row: {
          button_label: string | null;
          created_at: string;
          href: string | null;
          id: string;
          is_active: boolean;
          media_type: string;
          media_url: string;
          sort_order: number;
          subtitle: string | null;
          title: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          button_label?: string | null;
          created_at?: string;
          href?: string | null;
          id?: string;
          is_active?: boolean;
          media_type?: string;
          media_url: string;
          sort_order?: number;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          button_label?: string | null;
          created_at?: string;
          href?: string | null;
          id?: string;
          is_active?: boolean;
          media_type?: string;
          media_url?: string;
          sort_order?: number;
          subtitle?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_levels: {
        Row: {
          incoming_quantity: number;
          quantity_available: number | null;
          quantity_on_hand: number;
          quantity_reserved: number;
          reorder_point: number;
          updated_at: string;
          variant_id: string;
          warehouse_id: string;
        };
        ComputedFields: never;
        Insert: {
          incoming_quantity?: number;
          quantity_available?: never;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          reorder_point?: number;
          updated_at?: string;
          variant_id: string;
          warehouse_id: string;
        };
        Update: {
          incoming_quantity?: number;
          quantity_available?: never;
          quantity_on_hand?: number;
          quantity_reserved?: number;
          reorder_point?: number;
          updated_at?: string;
          variant_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_levels_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "public_catalog_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_levels_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          movement_type: string;
          notes: string | null;
          quantity: number;
          reference_id: string | null;
          reference_type: string | null;
          variant_id: string;
          warehouse_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type: string;
          notes?: string | null;
          quantity: number;
          reference_id?: string | null;
          reference_type?: string | null;
          variant_id: string;
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type?: string;
          notes?: string | null;
          quantity?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          variant_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "public_catalog_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          bucket_id: string;
          content_type: string | null;
          created_at: string;
          deleting_at: string | null;
          file_name: string;
          file_path: string;
          file_size_bytes: number | null;
          id: string;
          public_url: string;
        };
        ComputedFields: never;
        Insert: {
          bucket_id?: string;
          content_type?: string | null;
          created_at?: string;
          deleting_at?: string | null;
          file_name: string;
          file_path: string;
          file_size_bytes?: number | null;
          id?: string;
          public_url: string;
        };
        Update: {
          bucket_id?: string;
          content_type?: string | null;
          created_at?: string;
          deleting_at?: string | null;
          file_name?: string;
          file_path?: string;
          file_size_bytes?: number | null;
          id?: string;
          public_url?: string;
        };
        Relationships: [];
      };
      price_lists: {
        Row: {
          country_code: string;
          created_at: string;
          currency: string;
          customer_group: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sales_channel: string;
          starts_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          country_code?: string;
          created_at?: string;
          currency?: string;
          customer_group?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sales_channel?: string;
          starts_at?: string | null;
          updated_at?: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          currency?: string;
          customer_group?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sales_channel?: string;
          starts_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_colors: {
        Row: {
          color_id: string;
          position: number;
          product_id: string;
        };
        ComputedFields: never;
        Insert: {
          color_id: string;
          position?: number;
          product_id: string;
        };
        Update: {
          color_id?: string;
          position?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_colors_color_id_fkey";
            columns: ["color_id"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_colors_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_media: {
        Row: {
          alt_text: string | null;
          asset_path: string;
          color_id: string | null;
          created_at: string;
          id: string;
          is_lifestyle: boolean;
          is_primary: boolean;
          media_type: string;
          position: number;
          product_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alt_text?: string | null;
          asset_path: string;
          color_id?: string | null;
          created_at?: string;
          id?: string;
          is_lifestyle?: boolean;
          is_primary?: boolean;
          media_type?: string;
          position?: number;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          alt_text?: string | null;
          asset_path?: string;
          color_id?: string | null;
          created_at?: string;
          id?: string;
          is_lifestyle?: boolean;
          is_primary?: boolean;
          media_type?: string;
          position?: number;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_media_color_id_fkey";
            columns: ["color_id"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_media_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sizes: {
        Row: {
          position: number;
          product_id: string;
          size_id: string;
        };
        ComputedFields: never;
        Insert: {
          position?: number;
          product_id: string;
          size_id: string;
        };
        Update: {
          position?: number;
          product_id?: string;
          size_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_sizes_size_id_fkey";
            columns: ["size_id"];
            isOneToOne: false;
            referencedRelation: "sizes";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          color_id: string | null;
          combination_key: string;
          created_at: string;
          id: string;
          is_active: boolean;
          position: number;
          product_id: string;
          size_id: string | null;
          sku: string | null;
          updated_at: string;
          variant_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          color_id?: string | null;
          combination_key: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          position?: number;
          product_id: string;
          size_id?: string | null;
          sku?: string | null;
          updated_at?: string;
          variant_name?: string | null;
        };
        Update: {
          color_id?: string | null;
          combination_key?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          position?: number;
          product_id?: string;
          size_id?: string | null;
          sku?: string | null;
          updated_at?: string;
          variant_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey";
            columns: ["color_id"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_size_id_fkey";
            columns: ["size_id"];
            isOneToOne: false;
            referencedRelation: "sizes";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          care_instructions: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          fit_id: string | null;
          gender: string | null;
          id: string;
          is_featured: boolean;
          material_summary: string | null;
          name: string;
          short_description: string | null;
          slug: string;
          status: string;
          subcategory_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          care_instructions?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          fit_id?: string | null;
          gender?: string | null;
          id?: string;
          is_featured?: boolean;
          material_summary?: string | null;
          name: string;
          short_description?: string | null;
          slug: string;
          status?: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Update: {
          care_instructions?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          fit_id?: string | null;
          gender?: string | null;
          id?: string;
          is_featured?: boolean;
          material_summary?: string | null;
          name?: string;
          short_description?: string | null;
          slug?: string;
          status?: string;
          subcategory_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_fit_id_fkey";
            columns: ["fit_id"];
            isOneToOne: false;
            referencedRelation: "fits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_subcategory_id_fkey";
            columns: ["subcategory_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      sizes: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      variant_prices: {
        Row: {
          amount_cents: number;
          compare_at_amount_cents: number | null;
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          price_list_id: string;
          starts_at: string | null;
          tax_included: boolean;
          updated_at: string;
          variant_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          compare_at_amount_cents?: number | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          price_list_id: string;
          starts_at?: string | null;
          tax_included?: boolean;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          amount_cents?: number;
          compare_at_amount_cents?: number | null;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          price_list_id?: string;
          starts_at?: string | null;
          tax_included?: boolean;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "variant_prices_price_list_id_fkey";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_prices_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "variant_prices_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "public_catalog_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouses: {
        Row: {
          address: string | null;
          code: string;
          country_code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          code: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          code?: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_catalog_variants: {
        Row: {
          amount_cents: number | null;
          color_id: string | null;
          id: string;
          is_available: boolean | null;
          position: number;
          product_id: string;
          size_id: string | null;
          sku: string | null;
          variant_name: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "product_variants_color_id_fkey";
            columns: ["color_id"];
            isOneToOne: false;
            referencedRelation: "colors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_size_id_fkey";
            columns: ["size_id"];
            isOneToOne: false;
            referencedRelation: "sizes";
            referencedColumns: ["id"];
          },
        ];
      };
      view_media_usage: {
        Row: {
          bucket_id: string;
          content_type: string | null;
          created_at: string;
          file_name: string;
          file_path: string;
          file_size_bytes: number | null;
          id: string;
          public_url: string;
          usage_count: number | null;
          used_in_products: Json | null;
        };
        ComputedFields: never;
        Insert: {
          bucket_id?: string | null;
          content_type?: string | null;
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string | null;
          public_url?: string | null;
          usage_count?: never;
          used_in_products?: never;
        };
        Update: {
          bucket_id?: string | null;
          content_type?: string | null;
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string | null;
          public_url?: string | null;
          usage_count?: never;
          used_in_products?: never;
        };
        Relationships: [];
      };
    };
    Functions: {
      adjust_catalog_stock: {
        Args: {
          p_expected: number;
          p_quantity: number;
          p_reason: string;
          p_variant_id: string;
        };
        Returns: undefined;
      };
      begin_media_deletion: {
        Args: { p_id: string };
        Returns: {
          file_path: string;
        }[];
      };
      delete_catalog_value: {
        Args: { p_kind: string; p_value_id: string };
        Returns: number;
      };
      finish_media_deletion: {
        Args: { p_id: string; p_removed: boolean };
        Returns: undefined;
      };
      is_active_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      reorder_home_slides: { Args: { p_ids: string[] }; Returns: undefined };
      restore_catalog_snapshot: {
        Args: { p_snapshot: Json };
        Returns: undefined;
      };
      save_catalog_product: { Args: { p_payload: Json }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
