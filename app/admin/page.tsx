import type { Metadata } from 'next'
import { DataProvider } from '@/lib/admin/data-context'
import { AdminApp } from '@/components/admin/AdminApp'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Panel de control y administración para Vintage 29'
}

export default function AdminPage() {
  return (
    <DataProvider>
      <AdminApp />
    </DataProvider>
  )
}
