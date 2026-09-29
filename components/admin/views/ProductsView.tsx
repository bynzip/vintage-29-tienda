'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useData } from '@/lib/admin/data-context'
import { getAvailableStock, getStockStatus } from '@/lib/admin/initial-data'
import { Product, ProductVariant } from '@/lib/admin/types'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ProductsViewProps {
  onOpenNewProduct: () => void
  onAdjustVariant: (variant: ProductVariant) => void
}

type PublishFilter = '' | 'published' | 'hidden'

export const ProductsView: React.FC<ProductsViewProps> = ({ onOpenNewProduct, onAdjustVariant }) => {
  const { products, variantRows, toggleProductPublished, deleteProduct, deleteVariant } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const variantsByProduct = useMemo(() => {
    const map = new Map<string, ProductVariant[]>()
    variantRows.forEach(v => {
      const key = String(v.product_id)
      const list = map.get(key) ?? []
      list.push(v)
      map.set(key, list)
    })
    return map
  }, [variantRows])

  const matchesSearch = (product: Product): boolean => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    if (product.name.toLowerCase().includes(query)) return true
    if (product.category.toLowerCase().includes(query)) return true
    return (variantsByProduct.get(String(product.id)) ?? []).some(v => v.sku.toLowerCase().includes(query))
  }

  const filtered = products.filter(product => {
    const matchSearch = matchesSearch(product)
    const matchPublish =
      !publishFilter ||
      (publishFilter === 'published' && product.is_published) ||
      (publishFilter === 'hidden' && !product.is_published)
    return matchSearch && matchPublish
  })

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <SectionHeader title="Productos" subtitle="Plantillas publicadas y sus variantes (talla y color)">
        <Button onClick={onOpenNewProduct}>+ Nuevo producto</Button>
      </SectionHeader>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            className="min-w-[280px]"
            placeholder="Buscar por producto, categoría o SKU..."
            aria-label="Buscar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            aria-label="Filtrar por publicación"
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            <option value="published">Publicados</option>
            <option value="hidden">No publicados</option>
          </select>
          {(searchQuery || publishFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setPublishFilter('')
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Variantes</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(product => {
                const key = String(product.id)
                const productVariants = variantsByProduct.get(key) ?? []
                const isOpen = expanded.has(key)
                const totalAvailable = productVariants.reduce((sum, v) => sum + Math.max(getAvailableStock(v), 0), 0)

                return (
                  <React.Fragment key={key}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(key)}
                          aria-label={isOpen ? 'Contraer variantes' : 'Expandir variantes'}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-semibold">{product.name}</TableCell>
                      <TableCell>
                        <StatusBadge>{product.category}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">S/ {Number(product.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{productVariants.length}</TableCell>
                      <TableCell className="text-right font-semibold">{totalAvailable}</TableCell>
                      <TableCell>
                        <StatusBadge tone={product.is_published ? 'ok' : 'warn'}>
                          {product.is_published ? 'Sí' : 'No'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleProductPublished(product.id)}
                          >
                            {product.is_published ? 'Ocultar' : 'Publicar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            onClick={() => {
                              if (confirm(`¿Eliminar el producto ${product.name} y sus ${productVariants.length} variantes?`)) {
                                deleteProduct(product.id)
                              }
                            }}
                            title="Eliminar producto"
                          >
                            ×
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell />
                        <TableCell colSpan={7} className="p-0">
                          {productVariants.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="pl-6">SKU</TableHead>
                                  <TableHead>Talla</TableHead>
                                  <TableHead>Color</TableHead>
                                  <TableHead className="text-right">Disponible</TableHead>
                                  <TableHead>Estado</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {productVariants.map(v => {
                                  const status = getStockStatus(v)
                                  return (
                                    <TableRow key={v.id}>
                                      <TableCell className="pl-6">
                                        <code>{v.sku}</code>
                                      </TableCell>
                                      <TableCell>{v.size}</TableCell>
                                      <TableCell>{v.color}</TableCell>
                                      <TableCell className="text-right font-semibold">{getAvailableStock(v)}</TableCell>
                                      <TableCell>
                                        <StatusBadge tone={status.badgeClass}>{status.label}</StatusBadge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="inline-flex gap-1.5">
                                          <Button variant="outline" size="sm" onClick={() => onAdjustVariant(v)}>
                                            Ajustar
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                            onClick={() => {
                                              if (confirm(`¿Eliminar la variante ${v.sku}?`)) {
                                                deleteVariant(v.id)
                                              }
                                            }}
                                            title="Eliminar variante"
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="py-4 pl-6 text-sm text-muted-foreground">Este producto no tiene variantes.</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-9 text-center text-muted-foreground">
                  No hay productos con esos filtros. Cambia la búsqueda o el estado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
