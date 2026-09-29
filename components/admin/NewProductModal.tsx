'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/admin/data-context'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
}

export const NewProductModal: React.FC<NewProductModalProps> = ({ isOpen, onClose }) => {
  const { categories, addProduct } = useData()
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0]?.name || 'Blazers')
  const [price, setPrice] = useState<number>(129)
  const [sku, setSku] = useState('')
  const [size, setSize] = useState('M')
  const [color, setColor] = useState('Negro')
  const [assigned, setAssigned] = useState<number>(5)
  const [threshold, setThreshold] = useState<number>(2)
  const [isPublished, setIsPublished] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!productName.trim()) {
      setError('Ingresa el nombre del producto.')
      return
    }
    if (!sku.trim()) {
      setError('Ingresa un SKU único para la variante.')
      return
    }

    setIsSubmitting(true)
    const res = await addProduct({
      name: productName,
      description: description.trim(),
      category,
      price: Number(price),
      is_published: isPublished,
      images: [],
      variant: {
        sku,
        size,
        color,
        stock_online_qty: Number(assigned),
        threshold: Number(threshold)
      }
    })
    setIsSubmitting(false)

    if (res.success) {
      setProductName('')
      setDescription('')
      setSku('')
      onClose()
    } else {
      setError(res.error || 'Error al guardar el producto')
    }
  }

  const autoGenSku = () => {
    const pCode = productName.trim().slice(0, 3).toUpperCase() || 'PRD'
    const cCode = color.trim().slice(0, 3).toUpperCase() || 'COL'
    const sCode = size.toUpperCase()
    setSku(`${pCode}-${cCode}-${sCode}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nuevo Producto / Variante</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label>Nombre del Producto (plantilla)</Label>
            <Input
              type="text"
              placeholder="Ej. Blazer vintage terciopelo"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Descripción</Label>
            <Input
              type="text"
              placeholder="Ej. Blazer de corte oversize, tela liviana"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Categoría</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Precio (S/)</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} required />
            </div>
          </div>

          <p className="mt-1 border-t pt-3 text-[13px] font-semibold text-muted-foreground">Primera variante</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Talla</Label>
              <Input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="Ej. S, M, L, 28" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Color</Label>
              <Input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ej. Beige, Negro" required />
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>SKU (Código único de la variante)</Label>
              <Button type="button" variant="outline" size="sm" className="h-6 px-1.5 text-[11px]" onClick={autoGenSku}>
                Auto-generar
              </Button>
            </div>
            <Input
              type="text"
              placeholder="Ej. BLZ-TER-M-NEG"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Stock inicial asignado</Label>
              <Input type="number" value={assigned} onChange={(e) => setAssigned(parseInt(e.target.value, 10))} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Umbral stock bajo</Label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value, 10))} required />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publicar inmediatamente en la tienda
          </label>

          {error && <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
