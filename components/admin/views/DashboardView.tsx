'use client'

import React from 'react'
import { useData } from '@/lib/admin/data-context'
import { getAvailableStock } from '@/lib/admin/initial-data'
import { TabName } from '@/components/admin/Header'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge, StatusTone } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface DashboardViewProps {
  onNavigateTab: (tab: TabName) => void
}

const movementTone = (type: string): StatusTone =>
  type === 'Entrada' ? 'ok' : type === 'Venta' ? 'bad' : 'warn'

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { products, variantRows, movements } = useData()

  const publishedProducts = products.filter(p => p.is_published)
  const publishedVariants = variantRows.filter(v => v.is_published)
  const outOfStockCount = publishedVariants.filter(v => getAvailableStock(v) <= 0).length
  const lowStockCount = publishedVariants.filter(v => {
    const disp = getAvailableStock(v)
    return disp > 0 && disp <= v.threshold
  }).length

  return (
    <div>
      <SectionHeader title="Panel" subtitle="Resumen en tiempo real de tu tienda Vintage 29">
        <Button variant="outline" onClick={() => onNavigateTab('Portada web')}>
          ✏️ Editar Portada
        </Button>
        <Button onClick={() => onNavigateTab('Inventario')}>📦 Gestionar Inventario</Button>
      </SectionHeader>

      <div className="mb-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <MetricCard
          label="Productos publicados"
          icon="▢"
          value={publishedProducts.length}
          hint="Plantillas en catálogo visible"
          onClick={() => onNavigateTab('Productos')}
        />
        <MetricCard
          label="Variantes activas"
          icon="▤"
          value={publishedVariants.length}
          hint="Tallas y colores"
          onClick={() => onNavigateTab('Productos')}
        />
        <MetricCard
          label="Agotadas"
          icon="⊘"
          tone="bad"
          value={outOfStockCount}
          hint="Requieren reposición"
          onClick={() => onNavigateTab('Inventario')}
        />
        <MetricCard
          label="Stock bajo"
          icon="▾"
          tone="warn"
          value={lowStockCount}
          hint="Bajo el umbral mínimo"
          onClick={() => onNavigateTab('Inventario')}
        />
      </div>

      <Card className="p-6">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold tracking-tight">Últimos ajustes de inventario</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigateTab('Movimientos')}>
            Ver todos los movimientos →
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.slice(0, 5).map((m, idx) => (
              <TableRow key={m.id || idx}>
                <TableCell>{m.date}</TableCell>
                <TableCell>
                  <code className="font-semibold">{m.sku}</code>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={movementTone(m.type)}>{m.type}</StatusBadge>
                </TableCell>
                <TableCell className={m.quantity > 0 ? 'text-right font-semibold text-emerald-600 dark:text-emerald-400' : 'text-right font-semibold'}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </TableCell>
                <TableCell>{m.reason}</TableCell>
                <TableCell className="text-[12.5px] text-muted-foreground">{m.user}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

interface MetricCardProps {
  label: string
  icon: string
  value: number
  hint: string
  tone?: StatusTone
  onClick: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({ label, icon, value, hint, tone, onClick }) => {
  const valueColor =
    tone === 'bad' && value > 0
      ? 'text-red-600 dark:text-red-400'
      : tone === 'warn' && value > 0
        ? 'text-amber-600 dark:text-amber-400'
        : ''

  return (
    <Card onClick={onClick} className="cursor-pointer p-[22px] transition-transform hover:-translate-y-0.5">
      <div className="mb-2 flex items-center justify-between text-[13px] font-medium">
        <span>{label}</span>
        <span
          className={
            tone === 'bad'
              ? 'text-lg text-red-600 dark:text-red-400'
              : tone === 'warn'
                ? 'text-lg text-amber-600 dark:text-amber-400'
                : 'text-lg text-muted-foreground'
          }
        >
          {icon}
        </span>
      </div>
      <div className={`text-[28px] font-bold tracking-tight ${valueColor}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Card>
  )
}
