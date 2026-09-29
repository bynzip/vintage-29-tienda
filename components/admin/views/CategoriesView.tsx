'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/admin/data-context'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const CategoriesView: React.FC = () => {
  const { products, categories, addCategory } = useData()
  const [newCatName, setNewCatName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const counts: Record<string, number> = {}
  products.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1
  })

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    await addCategory(newCatName.trim())
    setNewCatName('')
    setShowAddForm(false)
  }

  return (
    <div>
      <SectionHeader title="Categorías" subtitle="Cómo se agrupan y organizan los productos en la tienda">
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancelar' : '+ Nueva categoría'}
        </Button>
      </SectionHeader>

      {showAddForm && (
        <Card className="mb-4 p-6">
          <form onSubmit={handleCreateCategory} className="flex flex-wrap items-center gap-2.5">
            <Input
              type="text"
              placeholder="Nombre de la categoría (ej. Accesorios)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="min-w-[260px]"
              required
            />
            <Button type="submit">Guardar categoría</Button>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre de Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Productos asociados</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-semibold">{cat.name}</TableCell>
                <TableCell className="text-muted-foreground">{cat.description || 'Sin descripción'}</TableCell>
                <TableCell className="text-right font-semibold">{counts[cat.name] || 0}</TableCell>
                <TableCell>
                  <StatusBadge tone={cat.is_active ? 'ok' : 'warn'}>
                    {cat.is_active ? 'Activa' : 'Inactiva'}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
