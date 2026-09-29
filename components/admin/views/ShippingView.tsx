'use client'

import React from 'react'
import { useData } from '@/lib/admin/data-context'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const ShippingView: React.FC = () => {
  const { shippingZones } = useData()

  return (
    <div>
      <SectionHeader title="Envíos y Tarifas" subtitle="Métodos de entrega y tarifas de envío por zona geográfica">
        <StatusBadge tone="ok" className="px-3.5 py-1.5">
          Etapa 1: En preparación
        </StatusBadge>
      </SectionHeader>

      <Card className="mb-5 p-6">
        <h2 className="mb-2 text-base font-semibold">Zonas y Tarifas configuradas</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Estas tarifas serán consumidas por el checkout de la tienda web mediante Supabase.
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zona / Cobertura</TableHead>
              <TableHead>Tiempo Estimado</TableHead>
              <TableHead className="text-right">Tarifa (S/)</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shippingZones.map((z) => (
              <TableRow key={z.id}>
                <TableCell className="font-semibold">{z.name}</TableCell>
                <TableCell>{z.estimated_delivery}</TableCell>
                <TableCell className="text-right font-bold">S/ {Number(z.price).toFixed(2)}</TableCell>
                <TableCell>
                  <StatusBadge tone="ok">Habilitada</StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-dashed bg-muted p-6">
        <p className="text-[13.5px] text-muted-foreground">
          💡 <strong>Nota del sistema:</strong> La cotización dinámica por código postal y operador logístico se activará en la etapa 2 con Supabase Edge Functions.
        </p>
      </Card>
    </div>
  )
}
