'use client'

import React from 'react'
import { Moon, Store, Sun } from 'lucide-react'
import { useData } from '@/lib/admin/data-context'
import { cn } from '@/lib/utils'

export type TabName = 'Resumen' | 'Portada web' | 'Productos' | 'Inventario' | 'Movimientos' | 'Categorías' | 'Envíos'

interface HeaderProps {
  currentTab: TabName
  onSelectTab: (tab: TabName) => void
  onOpenSupabaseModal: () => void
}

const TABS: TabName[] = ['Resumen', 'Portada web', 'Productos', 'Inventario', 'Movimientos', 'Categorías', 'Envíos']

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, onOpenSupabaseModal }) => {
  const { theme, toggleTheme, isSupabaseConnected } = useData()

  return (
    <header className="sticky top-0 z-40 flex items-center gap-5 border-b bg-card px-6 py-3 backdrop-blur">
      <div className="flex min-w-[190px] items-center justify-between gap-2.5 rounded-lg border bg-card px-3.5 py-2 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          Vintage 29
        </span>
        <span aria-hidden="true" className="text-[11px] text-muted-foreground">⇅</span>
      </div>

      <nav aria-label="Secciones de la tienda" className="flex flex-1 gap-2 overflow-x-auto whitespace-nowrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={currentTab === tab ? 'page' : undefined}
            onClick={() => onSelectTab(tab)}
            className={cn(
              'rounded-md px-3.5 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              currentTab === tab && 'bg-muted font-semibold text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenSupabaseModal}
          title="Ver estado de conexión con Supabase"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-opacity hover:opacity-85',
            isSupabaseConnected
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}
        >
          <span className="text-[8px]">●</span>
          {isSupabaseConnected ? 'Supabase: Conectado' : 'Supabase: Configurar'}
        </button>

        <button
          type="button"
          aria-label="Cambiar tema"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-muted"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border bg-gradient-to-br from-[#3d2b24] to-[#7a5a4c] text-[11px] font-bold text-white"
          title="admin@vintage29"
          aria-hidden="true"
        >
          V29
        </div>
      </div>
    </header>
  )
}
