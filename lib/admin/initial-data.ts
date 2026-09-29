import { Product, ProductVariant, InventoryMovement, HeroSlide, VariantRow } from '@/lib/admin/types'

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Blazer oversize lino', slug: 'blazer-oversize-lino', description: '', category: 'Blazers', price: 189, images: [], is_published: true, odoo_template_id: null },
  { id: 2, name: 'Jean mom fit', slug: 'jean-mom-fit', description: '', category: 'Pantalones', price: 139, images: [], is_published: true, odoo_template_id: null },
  { id: 3, name: 'Blusa satén', slug: 'blusa-saten', description: '', category: 'Blusas', price: 99, images: [], is_published: true, odoo_template_id: null },
  { id: 4, name: 'Vestido midi floral', slug: 'vestido-midi-floral', description: '', category: 'Vestidos', price: 159, images: [], is_published: false, odoo_template_id: null },
  { id: 5, name: 'Falda plisada', slug: 'falda-plisada', description: '', category: 'Faldas', price: 119, images: [], is_published: true, odoo_template_id: null }
]

export const INITIAL_VARIANTS: ProductVariant[] = [
  { id: 1, product_id: 1, sku: 'BLZ-LIN-M-BEI', size: 'M', color: 'Beige', stock_online_qty: 6, reserved_qty: 1, sold_qty: 2, threshold: 2, is_active: true, odoo_product_id: null },
  { id: 2, product_id: 1, sku: 'BLZ-LIN-L-BEI', size: 'L', color: 'Beige', stock_online_qty: 4, reserved_qty: 0, sold_qty: 4, threshold: 2, is_active: true, odoo_product_id: null },
  { id: 3, product_id: 2, sku: 'JEA-MOM-28-AZU', size: '28', color: 'Azul', stock_online_qty: 8, reserved_qty: 2, sold_qty: 4, threshold: 3, is_active: true, odoo_product_id: null },
  { id: 4, product_id: 2, sku: 'JEA-MOM-30-AZU', size: '30', color: 'Azul', stock_online_qty: 5, reserved_qty: 0, sold_qty: 3, threshold: 3, is_active: true, odoo_product_id: null },
  { id: 5, product_id: 3, sku: 'BLU-SAT-S-NEG', size: 'S', color: 'Negro', stock_online_qty: 10, reserved_qty: 0, sold_qty: 3, threshold: 2, is_active: true, odoo_product_id: null },
  { id: 6, product_id: 3, sku: 'BLU-SAT-M-VIN', size: 'M', color: 'Vino', stock_online_qty: 3, reserved_qty: 1, sold_qty: 2, threshold: 2, is_active: true, odoo_product_id: null },
  { id: 7, product_id: 4, sku: 'VES-FLO-S-VER', size: 'S', color: 'Verde', stock_online_qty: 2, reserved_qty: 0, sold_qty: 0, threshold: 2, is_active: true, odoo_product_id: null },
  { id: 8, product_id: 5, sku: 'FAL-PLI-M-CAM', size: 'M', color: 'Camel', stock_online_qty: 4, reserved_qty: 0, sold_qty: 1, threshold: 2, is_active: true, odoo_product_id: null }
]

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: 1, date: '2026-09-28 09:12', sku: 'BLU-SAT-M-VIN', type: 'Ajuste', quantity: -1, reason: 'Prenda con defecto', user: 'marketing@vintage29' },
  { id: 2, date: '2026-09-27 17:40', sku: 'JEA-MOM-28-AZU', type: 'Entrada', quantity: 4, reason: 'Reposición de bodega', user: 'admin@vintage29' },
  { id: 3, date: '2026-09-26 11:05', sku: 'BLZ-LIN-L-BEI', type: 'Venta', quantity: -1, reason: 'Pedido pagado', user: 'sistema' }
]

export const INITIAL_SLIDES: HeroSlide[] = [
  {
    id: 1,
    type: 'video',
    zone: 'main',
    title: 'Nueva colección de otoño',
    subtitle: 'Piezas vintage elegidas a mano',
    button_text: 'Ver colección',
    link_url: '/catalogo',
    media_url: '',
    overlay_opacity: 40,
    alignment: 'left',
    is_published: true,
    order_index: 0
  },
  {
    id: 2,
    type: 'banner',
    zone: 'main',
    title: 'Blazers de lino',
    subtitle: 'Últimas unidades disponibles',
    button_text: 'Comprar ahora',
    link_url: '/categoria/blazers',
    media_url: '',
    overlay_opacity: 30,
    alignment: 'center',
    is_published: true,
    order_index: 1
  },
  {
    id: 3,
    type: 'banner',
    zone: 'sub',
    title: 'Blazers',
    subtitle: '',
    button_text: 'Ver más',
    link_url: '/categoria/blazers',
    media_url: '',
    overlay_opacity: 30,
    alignment: 'center',
    is_published: true,
    order_index: 0
  },
  {
    id: 4,
    type: 'banner',
    zone: 'sub',
    title: 'Jeans',
    subtitle: '',
    button_text: 'Ver más',
    link_url: '/categoria/pantalones',
    media_url: '',
    overlay_opacity: 30,
    alignment: 'center',
    is_published: true,
    order_index: 1
  },
  {
    id: 5,
    type: 'banner',
    zone: 'sub',
    title: 'Blusas',
    subtitle: '',
    button_text: 'Ver más',
    link_url: '/categoria/blusas',
    media_url: '',
    overlay_opacity: 30,
    alignment: 'center',
    is_published: true,
    order_index: 2
  }
]

export function getAvailableStock(variant: Pick<ProductVariant, 'stock_online_qty' | 'sold_qty' | 'reserved_qty'>): number {
  return variant.stock_online_qty - variant.sold_qty - variant.reserved_qty
}

export function getStockStatus(variant: Pick<ProductVariant, 'stock_online_qty' | 'sold_qty' | 'reserved_qty' | 'threshold'>): { label: 'Agotado' | 'Stock bajo' | 'Disponible'; badgeClass: 'bad' | 'warn' | 'ok' } {
  const disp = getAvailableStock(variant)
  if (disp <= 0) {
    return { label: 'Agotado', badgeClass: 'bad' }
  }
  if (disp <= variant.threshold) {
    return { label: 'Stock bajo', badgeClass: 'warn' }
  }
  return { label: 'Disponible', badgeClass: 'ok' }
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function joinVariants(products: Product[], variants: ProductVariant[]): VariantRow[] {
  const byId = new Map(products.map(p => [String(p.id), p]))
  return variants.map(v => {
    const product = byId.get(String(v.product_id))
    return {
      ...v,
      product_name: product?.name ?? 'Producto eliminado',
      category: product?.category ?? '—',
      price: product ? Number(product.price) : 0,
      is_published: product?.is_published ?? false
    }
  })
}
