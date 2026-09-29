'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/admin/data-context'
import { getAvailableStock, getStockStatus } from '@/lib/admin/initial-data'
import { ProductVariant } from '@/lib/admin/types'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface InventoryViewProps {
  onAdjustVariant: (variant: ProductVariant) => void
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onAdjustVariant }) => {
  const { variantRows } = useData()
  const [filterQuery, setFilterQuery] = useState('')

  const filtered = variantRows.filter(v =>
    !filterQuery ||
    v.product_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    v.sku.toLowerCase().includes(filterQuery.toLowerCase())
  )

  return (
    <div>
      <SectionHeader title="Inventario online" subtitle="Unidades asignadas al canal de venta online por variante">
        <div className="text-[13px] text-muted-foreground">
          Total variantes: <strong>{variantRows.length}</strong>
        </div>
      </SectionHeader>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            className="min-w-[300px]"
            placeholder="Filtrar por producto o SKU..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <Button variant="outline" size="sm" onClick={() => setFilterQuery('')}>
              Limpiar
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Asignado</TableHead>
              <TableHead className="text-right">Reservado</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map(v => {
                const disp = getAvailableStock(v)
                const status = getStockStatus(v)
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">
                      {v.product_name} · {v.size} · {v.color}
                    </TableCell>
                    <TableCell>
                      <code>{v.sku}</code>
                    </TableCell>
                    <TableCell className="text-right">{v.stock_online_qty}</TableCell>
                    <TableCell className={v.reserved_qty > 0 ? 'text-right text-amber-600 dark:text-amber-400' : 'text-right text-muted-foreground'}>
                      {v.reserved_qty}
                    </TableCell>
                    <TableCell className="text-right">{v.sold_qty}</TableCell>
                    <TableCell className={disp <= 0 ? 'text-right font-bold text-red-600 dark:text-red-400' : 'text-right font-bold'}>
                      {disp}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={status.badgeClass}>{status.label}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onAdjustVariant(v)}>
                        Ajustar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-9 text-center text-muted-foreground">
                  No se encontraron variantes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
