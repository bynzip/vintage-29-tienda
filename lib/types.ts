/**
 * Esquema canónico propio de la tienda (docs/02-arquitectura.md §7).
 * Es el "idioma" que habla el storefront; Odoo solo se conoce dentro de lib/odoo.
 */

export type Product = {
  id: string;
  odooTemplateId: number | null;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string | null;
  images: string[];
  variants: Variant[];
  published: boolean;
  updatedAt: string;
};

export type Variant = {
  id: string;
  odooProductId: number | null;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  extraPrice: number;
  stock: number;
  updatedAt: string;
};

export type Category = {
  id: string;
  odooId: number | null;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
};

export type Attribute = {
  id: string;
  name: string;
  values: AttributeValue[];
};

export type AttributeValue = {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export type ShippingZone = {
  carrierId: string;
  name: string;
  rules: { zone: string; price: number }[];
  active: boolean;
};

export type PreOrderStatus =
  | "pendiente_pago"
  | "pago_confirmado"
  | "pagado_pendiente_registro"
  | "registrado"
  | "pago_fallido"
  | "abandonado";

export type PreOrderItem = {
  odooProductId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type PreOrder = {
  id: string;
  items: PreOrderItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    document: { type: "DNI" | "RUC"; number: string; businessName?: string };
  };
  shipping: {
    method: "pickup" | "delivery";
    department?: string;
    province?: string;
    district?: string;
    address?: string;
    reference?: string;
    cost: number;
  };
  totals: { subtotal: number; shipping: number; total: number };
  status: PreOrderStatus;
  culqiChargeId?: string;
  odooOrderId?: number;
  odooOrderName?: string;
  createdAt: string;
  updatedAt: string;
};
