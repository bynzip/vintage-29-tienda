export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface CategoryItem {
  id: number | string
  name: string
  slug?: string
  description?: string
  is_active: boolean
  created_at?: string
}

export interface Product {
  id: number | string
  name: string
  slug: string
  description: string
  category: string
  price: number
  images: string[]
  is_published: boolean
  odoo_template_id: number | null
  created_at?: string
  updated_at?: string
}

export interface ProductVariant {
  id: number | string
  product_id: number | string
  sku: string
  size: string
  color: string
  stock_online_qty: number
  reserved_qty: number
  sold_qty: number
  threshold: number
  is_active: boolean
  odoo_product_id: number | null
  created_at?: string
  updated_at?: string
}

export interface VariantRow extends ProductVariant {
  product_name: string
  category: string
  price: number
  is_published: boolean
}

export interface InventoryMovement {
  id?: number | string
  date: string
  sku: string
  type: 'Entrada' | 'Ajuste' | 'Venta' | 'Reserva'
  quantity: number
  reason: string
  user: string
  created_at?: string
}

export type SlideZone = 'main' | 'sub'
export type SlideType = 'video' | 'banner'
export type TextAlignment = 'left' | 'center' | 'right'

export interface HeroSlide {
  id: number | string
  type: SlideType
  zone: SlideZone
  title: string
  subtitle: string
  button_text: string
  link_url: string
  media_url: string
  overlay_opacity: number
  alignment: TextAlignment
  is_published: boolean
  order_index?: number
  created_at?: string
}

export interface ShippingZone {
  id: number | string
  name: string
  price: number
  estimated_delivery: string
  is_active: boolean
}

export interface NewProductInput {
  name: string
  description: string
  category: string
  price: number
  is_published: boolean
  images: string[]
  variant: {
    sku: string
    size: string
    color: string
    stock_online_qty: number
    threshold: number
  }
}
