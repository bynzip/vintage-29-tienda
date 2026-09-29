'use client'

import React, { useState } from 'react'
import { Header, TabName } from '@/components/admin/Header'
import { SupabaseModal } from '@/components/admin/SupabaseModal'
import { StockAdjustmentModal } from '@/components/admin/StockAdjustmentModal'
import { NewProductModal } from '@/components/admin/NewProductModal'
import { DashboardView } from '@/components/admin/views/DashboardView'
import { HeroEditorView } from '@/components/admin/views/HeroEditorView'
import { ProductsView } from '@/components/admin/views/ProductsView'
import { InventoryView } from '@/components/admin/views/InventoryView'
import { MovementsView } from '@/components/admin/views/MovementsView'
import { CategoriesView } from '@/components/admin/views/CategoriesView'
import { ShippingView } from '@/components/admin/views/ShippingView'
import { ProductVariant } from '@/lib/admin/types'
import { useData } from '@/lib/admin/data-context'

export const AdminApp: React.FC = () => {
  const { variantRows } = useData()
  const [currentTab, setCurrentTab] = useState<TabName>('Resumen')
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [selectedVariantForAdjustment, setSelectedVariantForAdjustment] = useState<ProductVariant | null>(null)

  const handleAdjustVariant = (variant: ProductVariant) => {
    setSelectedVariantForAdjustment(variant)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      <main className="mx-auto max-w-[1560px] px-9 pb-16 pt-7">
        {currentTab === 'Resumen' && <DashboardView onNavigateTab={setCurrentTab} />}
        {currentTab === 'Portada web' && <HeroEditorView />}
        {currentTab === 'Productos' && (
          <ProductsView
            onOpenNewProduct={() => setIsNewProductModalOpen(true)}
            onAdjustVariant={handleAdjustVariant}
          />
        )}
        {currentTab === 'Inventario' && <InventoryView onAdjustVariant={handleAdjustVariant} />}
        {currentTab === 'Movimientos' && <MovementsView />}
        {currentTab === 'Categorías' && <CategoriesView />}
        {currentTab === 'Envíos' && <ShippingView />}
      </main>

      <SupabaseModal isOpen={isSupabaseModalOpen} onClose={() => setIsSupabaseModalOpen(false)} />
      <StockAdjustmentModal
        variant={selectedVariantForAdjustment}
        variantLabel={variantRows.find(v => v.id === selectedVariantForAdjustment?.id)?.product_name}
        onClose={() => setSelectedVariantForAdjustment(null)}
      />
      <NewProductModal isOpen={isNewProductModalOpen} onClose={() => setIsNewProductModalOpen(false)} />
    </div>
  )
}
