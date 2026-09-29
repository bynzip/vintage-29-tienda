'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/admin/data-context'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge, StatusTone } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const movementTone = (type: string): StatusTone =>
  type === 'Entrada' ? 'ok' : type === 'Venta' ? 'bad' : 'warn'

export const MovementsView: React.FC = () => {
  const { movements } = useData()
  const [filterType, setFilterType] = useState('')
  const [filterSku, setFilterSku] = useState('')

  const filtered = movements.filter(m => {
    const matchType = !filterType || m.type === filterType
    const matchSku = !filterSku || m.sku.toLowerCase().includes(filterSku.toLowerCase())
    return matchType && matchSku
  })

  return (
    <div>
      <SectionHeader title="Movimientos de inventario" subtitle="Historial de auditoría: entradas, ajustes, reservas y ventas">
        <div className="text-[13px] text-muted-foreground">
          Total registros: <strong>{movements.length}</strong>
        </div>
      </SectionHeader>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder="Filtrar por SKU..."
            value={filterSku}
            onChange={(e) => setFilterSku(e.target.value)}
          />
          <select
            aria-label="Filtrar por tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos los tipos</option>
            <option value="Entrada">Entradas</option>
            <option value="Ajuste">Ajustes</option>
            <option value="Venta">Ventas</option>
            <option value="Reserva">Reservas</option>
          </select>
          {(filterSku || filterType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterSku('')
                setFilterType('')
              }}
            >
              Limpiar
            </Button>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((m, idx) => (
                <TableRow key={m.id || idx}>
                  <TableCell>{m.date}</TableCell>
                  <TableCell>
                    <code>{m.sku}</code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={movementTone(m.type)}>{m.type}</StatusBadge>
                  </TableCell>
                  <TableCell className={m.quantity > 0 ? 'text-right font-semibold text-emerald-600 dark:text-emerald-400' : 'text-right font-semibold'}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="text-muted-foreground">{m.user}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-9 text-center text-muted-foreground">
                  No hay movimientos que coincidan con los filtros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
