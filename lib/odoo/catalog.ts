import "server-only";
import { getOdooClient } from "@/lib/odoo/client";

/**
 * Lecturas de catálogo contra Odoo (docs/03).
 * TODO Fase 1: usar esto dentro del sincronizador para poblar la caché canónica.
 */

export async function fetchPublishedTemplates(limit = 80) {
  const odoo = getOdooClient();
  return odoo.searchRead(
    "product.template",
    [
      ["sale_ok", "=", true],
      ["active", "=", true],
    ],
    [
      "id",
      "name",
      "list_price",
      "default_code",
      "description_sale",
      "categ_id",
      "image_1920",
      "write_date",
    ],
    { limit, order: "id asc" },
  );
}

export async function fetchVariants(templateIds: number[]) {
  const odoo = getOdooClient();
  return odoo.searchRead(
    "product.product",
    [["product_tmpl_id", "in", templateIds]],
    [
      "id",
      "product_tmpl_id",
      "product_template_attribute_value_ids",
      "default_code",
      "lst_price",
      "free_qty",
      "active",
      "write_date",
    ],
  );
}
