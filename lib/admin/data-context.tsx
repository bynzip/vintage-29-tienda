'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  VariantRow,
  Product,
  ProductVariant,
  NewProductInput,
  InventoryMovement,
  HeroSlide,
  CategoryItem,
  ShippingZone
} from '@/lib/admin/types'
import {
  INITIAL_PRODUCTS,
  INITIAL_VARIANTS,
  INITIAL_MOVEMENTS,
  INITIAL_SLIDES,
  joinVariants,
  slugify
} from '@/lib/admin/initial-data'
import { supabase, isSupabaseConfigured, testSupabaseConnection } from '@/lib/admin/supabase'

interface DataContextType {
  products: Product[]
  variants: ProductVariant[]
  variantRows: VariantRow[]
  movements: InventoryMovement[]
  slides: HeroSlide[]
  categories: CategoryItem[]
  shippingZones: ShippingZone[]
  isLoading: boolean
  isSupabaseConnected: boolean
  connectionStatus: { success: boolean; message: string } | null
  theme: 'light' | 'dark'
  toggleTheme: () => void
  adjustStock: (variantId: number | string, delta: number, type: 'Entrada' | 'Ajuste', reason: string, user?: string) => Promise<{ success: boolean; error?: string }>
  addProduct: (input: NewProductInput) => Promise<{ success: boolean; error?: string }>
  toggleProductPublished: (productId: number | string) => Promise<{ success: boolean; error?: string }>
  deleteProduct: (productId: number | string) => Promise<{ success: boolean; error?: string }>
  deleteVariant: (variantId: number | string) => Promise<{ success: boolean; error?: string }>
  updateSlides: (newSlides: HeroSlide[]) => Promise<{ success: boolean; error?: string }>
  addCategory: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>
  refreshData: () => Promise<void>
  checkConnection: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const STORAGE_KEYS = {
  PRODUCTS: 'vintage29_v2_products',
  VARIANTS: 'vintage29_v2_variants',
  MOVEMENTS: 'vintage29_v2_movements',
  SLIDES: 'vintage29_v2_slides',
  THEME: 'vintage29_theme',
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 1, name: 'Blazers', is_active: true, description: 'Blazers de lino y paño vintage' },
  { id: 2, name: 'Pantalones', is_active: true, description: 'Jeans mom fit, rectos y flare' },
  { id: 3, name: 'Blusas', is_active: true, description: 'Blusas en satén y seda' },
  { id: 4, name: 'Vestidos', is_active: true, description: 'Vestidos midi y de fiesta' },
  { id: 5, name: 'Faldas', is_active: true, description: 'Faldas plisadas y vintage' }
]

const INITIAL_SHIPPING: ShippingZone[] = [
  { id: 1, name: 'Lima Metropolitana (Express 24-48h)', price: 12.00, estimated_delivery: '1-2 días hábiles', is_active: true },
  { id: 2, name: 'Provincias / Nivel Nacional (Olva Courier)', price: 18.00, estimated_delivery: '3-5 días hábiles', is_active: true }
]

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [variants, setVariants] = useState<ProductVariant[]>(INITIAL_VARIANTS)
  const [movements, setMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS)
  const [slides, setSlides] = useState<HeroSlide[]>(INITIAL_SLIDES)
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES)
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(INITIAL_SHIPPING)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const variantRows = useMemo(() => joinVariants(products, variants), [products, variants])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | null
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const activeTheme = savedTheme || (prefersDark ? 'dark' : 'light')
      setTheme(activeTheme)
      document.documentElement.classList.toggle('dark', activeTheme === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THEME, nextTheme)
      document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    }
  }

  const loadFromLocalStorage = () => {
    if (typeof window === 'undefined') return
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
      const savedVars = localStorage.getItem(STORAGE_KEYS.VARIANTS)
      const savedMovs = localStorage.getItem(STORAGE_KEYS.MOVEMENTS)
      const savedSlides = localStorage.getItem(STORAGE_KEYS.SLIDES)

      if (savedProducts) setProducts(JSON.parse(savedProducts))
      if (savedVars) setVariants(JSON.parse(savedVars))
      if (savedMovs) setMovements(JSON.parse(savedMovs))
      if (savedSlides) setSlides(JSON.parse(savedSlides))
    } catch (e) {
      console.warn('Error reading from localStorage', e)
    }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)

    if (isSupabaseConfigured && supabase) {
      try {
        const [prodRes, varRes, movRes, sliRes, catRes, shipRes] = await Promise.all([
          supabase.from('products').select('*').order('id', { ascending: true }),
          supabase.from('product_variants').select('*').order('id', { ascending: true }),
          supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }),
          supabase.from('hero_slides').select('*').order('order_index', { ascending: true }),
          supabase.from('categories').select('*').order('name', { ascending: true }),
          supabase.from('shipping_zones').select('*').order('id', { ascending: true })
        ])

        if (!prodRes.error) {
          setProducts(prodRes.data || [])
          setIsSupabaseConnected(true)
        } else {
          console.warn('Supabase fetch products error, using local fallback:', prodRes.error.message)
        }
        if (!varRes.error) setVariants(varRes.data || [])
        if (!movRes.error) setMovements(movRes.data || [])
        if (!sliRes.error) setSlides(sliRes.data || [])
        if (!catRes.error) setCategories(catRes.data || [])
        if (!shipRes.error) setShippingZones(shipRes.data || [])
      } catch (err) {
        console.error('Error fetching Supabase data:', err)
        loadFromLocalStorage()
      }
    } else {
      loadFromLocalStorage()
    }

    setIsLoading(false)
  }, [])

  const checkConnection = async () => {
    const result = await testSupabaseConnection()
    setConnectionStatus(result)
    setIsSupabaseConnected(result.success)
    if (result.success) {
      await loadData()
    }
  }

  useEffect(() => {
    loadData()
    if (isSupabaseConfigured) {
      checkConnection()
    }
  }, [loadData])

  const saveProducts = (nextProducts: Product[], nextVariants: ProductVariant[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts))
      localStorage.setItem(STORAGE_KEYS.VARIANTS, JSON.stringify(nextVariants))
    } catch (e) {
      console.warn('Error saving inventory to localStorage', e)
    }
  }

  const saveMovements = (nextMovements: InventoryMovement[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(nextMovements))
    } catch (e) {
      console.warn('Error saving movements to localStorage', e)
    }
  }

  const saveSlides = (nextSlides: HeroSlide[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEYS.SLIDES, JSON.stringify(nextSlides))
    } catch (e) {
      console.warn('Error saving slides to localStorage', e)
    }
  }

  const adjustStock = async (
    variantId: number | string,
    delta: number,
    type: 'Entrada' | 'Ajuste',
    reason: string,
    user: string = 'admin@vintage29'
  ): Promise<{ success: boolean; error?: string }> => {
    const variantIndex = variants.findIndex(v => v.id == variantId)
    if (variantIndex === -1) return { success: false, error: 'Variante no encontrada.' }

    const target = variants[variantIndex]
    const available = target.stock_online_qty - target.sold_qty - target.reserved_qty
    if (available + delta < 0) {
      return { success: false, error: 'El ajuste dejaría el stock disponible en negativo.' }
    }

    const updatedVariant = { ...target, stock_online_qty: target.stock_online_qty + delta }
    const newMovement: InventoryMovement = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      sku: target.sku,
      type,
      quantity: delta,
      reason,
      user
    }

    const newVariants = [...variants]
    newVariants[variantIndex] = updatedVariant
    const newMovements = [newMovement, ...movements]

    setVariants(newVariants)
    setMovements(newMovements)
    saveProducts(products, newVariants)
    saveMovements(newMovements)

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('product_variants')
          .update({ stock_online_qty: updatedVariant.stock_online_qty, updated_at: new Date().toISOString() })
          .eq('id', target.id)

        await supabase.from('inventory_movements').insert([
          {
            variant_id: target.id,
            sku: target.sku,
            type,
            quantity: delta,
            reason,
            user_email: user,
            date: newMovement.date
          }
        ])
      } catch (err) {
        console.error('Error syncing adjustment with Supabase:', err)
      }
    }

    return { success: true }
  }

  const addProduct = async (input: NewProductInput): Promise<{ success: boolean; error?: string }> => {
    const productId = Date.now()
    const variantId = productId + 1

    const product: Product = {
      id: productId,
      name: input.name.trim(),
      slug: slugify(input.name),
      description: input.description,
      category: input.category,
      price: Number(input.price),
      images: input.images,
      is_published: input.is_published,
      odoo_template_id: null
    }
    const variant: ProductVariant = {
      id: variantId,
      product_id: productId,
      sku: input.variant.sku.trim().toUpperCase(),
      size: input.variant.size,
      color: input.variant.color,
      stock_online_qty: Number(input.variant.stock_online_qty),
      reserved_qty: 0,
      sold_qty: 0,
      threshold: Number(input.variant.threshold),
      is_active: true,
      odoo_product_id: null
    }

    const nextProducts = [...products, product]
    const nextVariants = [...variants, variant]
    setProducts(nextProducts)
    setVariants(nextVariants)
    saveProducts(nextProducts, nextVariants)

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            slug: product.slug,
            description: product.description,
            category: product.category,
            price: product.price,
            images: product.images,
            is_published: product.is_published
          }])
          .select()
        if (prodError) throw prodError

        const savedProduct = prodData?.[0]
        if (savedProduct) {
          const { data: varData, error: varError } = await supabase
            .from('product_variants')
            .insert([{
              product_id: savedProduct.id,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              stock_online_qty: variant.stock_online_qty,
              threshold: variant.threshold,
              is_active: true
            }])
            .select()
          if (varError) throw varError

          const savedVariant = varData?.[0]
          setProducts(prev => prev.map(p => (p.id === productId ? savedProduct : p)))
          setVariants(prev => prev.map(v => (v.id === variantId ? savedVariant : v)))
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('Error adding product in Supabase:', errorMsg)
      }
    }

    return { success: true }
  }

  const toggleProductPublished = async (productId: number | string): Promise<{ success: boolean; error?: string }> => {
    const target = products.find(p => p.id === productId)
    if (!target) return { success: false, error: 'Producto no encontrado.' }

    const nextPublished = !target.is_published
    const nextProducts = products.map(p => (p.id === productId ? { ...p, is_published: nextPublished } : p))
    setProducts(nextProducts)
    saveProducts(nextProducts, variants)

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('products').update({ is_published: nextPublished, updated_at: new Date().toISOString() }).eq('id', productId)
      } catch (err) {
        console.error('Error toggling product in Supabase:', err)
      }
    }

    return { success: true }
  }

  const deleteProduct = async (productId: number | string): Promise<{ success: boolean; error?: string }> => {
    const nextProducts = products.filter(p => p.id !== productId)
    const nextVariants = variants.filter(v => v.product_id !== productId)
    setProducts(nextProducts)
    setVariants(nextVariants)
    saveProducts(nextProducts, nextVariants)

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('products').delete().eq('id', productId)
      } catch (err) {
        console.error('Error deleting product from Supabase:', err)
      }
    }

    return { success: true }
  }

  const deleteVariant = async (variantId: number | string): Promise<{ success: boolean; error?: string }> => {
    const nextVariants = variants.filter(v => v.id !== variantId)
    setVariants(nextVariants)
    saveProducts(products, nextVariants)

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('product_variants').delete().eq('id', variantId)
      } catch (err) {
        console.error('Error deleting variant from Supabase:', err)
      }
    }

    return { success: true }
  }

  const updateSlides = async (newSlides: HeroSlide[]): Promise<{ success: boolean; error?: string }> => {
    setSlides(newSlides)
    saveSlides(newSlides)

    if (isSupabaseConfigured && supabase) {
      try {
        for (let i = 0; i < newSlides.length; i++) {
          const s = newSlides[i]
          const payload = {
            type: s.type,
            zone: s.zone,
            title: s.title,
            subtitle: s.subtitle,
            button_text: s.button_text,
            link_url: s.link_url,
            media_url: s.media_url,
            overlay_opacity: s.overlay_opacity,
            alignment: s.alignment,
            is_published: s.is_published,
            order_index: i
          }

          if (typeof s.id === 'number' && s.id < 1000000000000) {
            await supabase.from('hero_slides').update(payload).eq('id', s.id)
          } else {
            await supabase.from('hero_slides').insert([payload])
          }
        }
      } catch (err) {
        console.error('Error syncing slides with Supabase:', err)
      }
    }

    return { success: true }
  }

  const addCategory = async (name: string, description: string = ''): Promise<{ success: boolean; error?: string }> => {
    const newCat: CategoryItem = { id: Date.now(), name, slug: slugify(name), is_active: true, description }
    setCategories(prev => [...prev, newCat])

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('categories').insert([{ name, slug: slugify(name), description, is_active: true }])
      } catch (err) {
        console.error('Error adding category in Supabase:', err)
      }
    }

    return { success: true }
  }

  return (
    <DataContext.Provider
      value={{
        products,
        variants,
        variantRows,
        movements,
        slides,
        categories,
        shippingZones,
        isLoading,
        isSupabaseConnected,
        connectionStatus,
        theme,
        toggleTheme,
        adjustStock,
        addProduct,
        toggleProductPublished,
        deleteProduct,
        deleteVariant,
        updateSlides,
        addCategory,
        refreshData: loadData,
        checkConnection
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextType {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
