import "server-only";
import type { PreOrder } from "@/lib/types";
import { getOdooClient } from "@/lib/odoo/client";

/**
 * Escritura de clientes y pedidos en Odoo (docs/04).
 * TODO Fase 4: implementar upsert de res.partner, create de sale.order,
 * línea de envío y action_confirm, con idempotencia por client_order_ref.
 */

export async function findOrCreatePartner(
  preorder: PreOrder,
): Promise<number | null> {
  const odoo = getOdooClient();
  const email = preorder.customer.email.trim().toLowerCase();
  const existing = await odoo.searchRead<{ id: number }>(
    "res.partner",
    [["email", "=", email]],
    ["id"],
    { limit: 1 },
  );
  if (existing.length) return existing[0].id;

  return odoo.create("res.partner", {
    name: preorder.customer.name,
    email,
    phone: preorder.customer.phone,
    customer_rank: 1,
  });
}

export async function registerSaleOrder(
  _preorder: PreOrder,
): Promise<{ id: number; name: string } | null> {
  return null;
}
