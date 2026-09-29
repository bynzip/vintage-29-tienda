'use client'

import React, { useState, useEffect } from 'react'
import { ProductVariant } from '@/lib/admin/types'
import { useData } from '@/lib/admin/data-context'
import { getAvailableStock } from '@/lib/admin/initial-data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StockAdjustmentModalProps {
  variant: ProductVariant | null
  variantLabel?: string
  onClose: () => void
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ variant, variantLabel, onClose }) => {
  const { adjustStock } = useData()
  const [type, setType] = useState<'Entrada' | 'Ajuste'>('Entrada')
  const [qty, setQty] = useState<number>(1)
  const [reason, setReason] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (variant) {
      setType('Entrada')
      setQty(1)
      setReason('')
      setError('')
    }
  }, [variant])

  if (!variant) return null

  const currentAvailable = getAvailableStock(variant)
  const previewAvailable = currentAvailable + (isNaN(qty) ? 0 : qty)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const delta = Number(qty)
    if (isNaN(delta) || delta === 0) {
      setError('Ingresa una cantidad distinta de 0.')
      return
    }

    if (type === 'Entrada' && delta < 0) {
      setError('Una entrada debe ser positiva. Usa "Ajuste" para restar unidades.')
      return
    }

    if (!reason.trim()) {
      setError('Escribe el motivo del ajuste.')
      return
    }

    if (currentAvailable + delta < 0) {
      setError(`El ajuste dejaría el stock disponible en negativo (${currentAvailable + delta}).`)
      return
    }

    setIsSubmitting(true)
    const res = await adjustStock(variant.id, delta, type, reason.trim())
    setIsSubmitting(false)

    if (res.success) {
      onClose()
    } else {
      setError(res.error || 'Error al guardar el ajuste')
    }
  }

  return (
    <Dialog open={Boolean(variant)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Ajustar stock</DialogTitle>
          <p className="text-[13px] text-muted-foreground">
            {variantLabel ? `${variantLabel} · ` : ''}{variant.size} · {variant.color} (<strong>{variant.sku}</strong>)
          </p>
        </DialogHeader>

        <div className="mb-1 flex items-center justify-between rounded-lg bg-muted px-3.5 py-3">
          <div>
            <div className="text-xs text-muted-foreground">Stock disponible actual</div>
            <div className="text-base font-bold">{currentAvailable} uds</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Stock posterior</div>
            <div className={`text-base font-bold ${previewAvailable < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {previewAvailable} uds
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="modal-tipo">Tipo de movimiento</Label>
            <select
              id="modal-tipo"
              value={type}
              onChange={(e) => setType(e.target.value as 'Entrada' | 'Ajuste')}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="Entrada">Entrada (Sumar stock)</option>
              <option value="Ajuste">Ajuste manual (Puede sumar o restar)</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="modal-qty">Cantidad</Label>
            <Input
              id="modal-qty"
              type="number"
              step="1"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10))}
              placeholder="Ej. 5 o -2"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="modal-mot">Motivo</Label>
            <Input
              id="modal-mot"
              type="text"
              placeholder="Ej. reposición de bodega, prenda defectuosa"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
