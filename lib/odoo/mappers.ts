import "server-only";
import type { Category, Product, Variant, ShippingZone } from "@/lib/types";

/**
 * Mapeo Odoo → esquema canónico. ÚNICO punto de acoplamiento con la estructura
 * real del ERP (documentado en docs/03, §5 y §9). Ajustar aquí según la
 * introspección de la instancia real.
 */

export function mapProductTemplate(template: Record<string, any>): Partial<Product> {
  return {
    odooTemplateId: template.id ?? null,
    name: template.name ?? "",
    description: template.description_sale ?? "",
    basePrice: template.list_price ?? 0,
    published: template.sale_ok !== false && template.active !== false,
  };
}

export function mapVariant(variant: Record<string, any>): Partial<Variant> {
  return {
    odooProductId: variant.id ?? null,
    sku: variant.default_code ?? variant.barcode ?? "",
    stock: variant.free_qty ?? 0,
  };
}

export function mapCategory(category: Record<string, any>): Partial<Category> {
  return {
    odooId: category.id ?? null,
    name: category.name ?? "",
    parentId: category.parent_id ? String(category.parent_id[0]) : null,
  };
}

export function mapShippingCarrier(
  carrier: Record<string, any>,
): Partial<ShippingZone> {
  return {
    name: carrier.name ?? "",
    active: carrier.active !== false,
    rules: [],
  };
}
