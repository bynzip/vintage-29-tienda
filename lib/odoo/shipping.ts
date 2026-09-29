import "server-only";
import { getOdooClient } from "@/lib/odoo/client";

/**
 * Lectura de carriers y reglas de envío (docs/05).
 * TODO Fase 1/3: sincronizar delivery.carrier + delivery.price.rule a ShippingZone
 * y cotizar localmente en el BFF.
 */

export async function fetchShippingCarriers() {
  const odoo = getOdooClient();
  return odoo.searchRead(
    "delivery.carrier",
    [["active", "=", true]],
    ["id", "name", "delivery_type", "product_id", "active"],
  );
}
