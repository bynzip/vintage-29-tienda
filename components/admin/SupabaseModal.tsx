'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/admin/data-context'
import { isSupabaseConfigured } from '@/lib/admin/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SupabaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { isSupabaseConnected, connectionStatus, checkConnection, refreshData } = useData()
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    await checkConnection()
    await refreshData()
    setTesting(false)
  }

  const copyEnvSnippet = () => {
    const snippet = `NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon`
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Conexión con Supabase</DialogTitle>
          <p className="text-[13px] text-muted-foreground">Estado y configuración de tu base de datos en la nube</p>
        </DialogHeader>

        <div
          className={cn(
            'flex items-center gap-3 rounded-[10px] border p-3.5',
            isSupabaseConnected
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          )}
        >
          <div className="text-2xl">{isSupabaseConnected ? '⚡' : '⚙️'}</div>
          <div>
            <div className={cn('text-sm font-semibold', isSupabaseConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
              {isSupabaseConnected ? 'Conectado en Vivo con Supabase' : 'Modo Local / Demo Activo'}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted-foreground">
              {isSupabaseConfigured
                ? 'Variables detectadas en .env.local.'
                : 'La app funciona al 100% con datos locales hasta que agregues tus credenciales.'}
            </div>
          </div>
        </div>

        {connectionStatus && (
          <div
            className={cn(
              'rounded-lg border px-3 py-2.5 text-[13px]',
              connectionStatus.success
                ? 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/20 bg-red-500/[0.08] text-red-600 dark:text-red-400'
            )}
          >
            {connectionStatus.message}
          </div>
        )}

        <div className="rounded-[10px] bg-muted p-4">
          <h3 className="mb-2 text-sm font-semibold">Cómo conectar en 2 pasos:</h3>
          <ol className="grid list-decimal gap-2 pl-5 text-[13px]">
            <li>
              Abre el archivo <code>.env.local</code> en la raíz del proyecto y coloca tu <strong>Project URL</strong> y <strong>Anon Key</strong> de Supabase.
            </li>
            <li>
              Ejecuta el script SQL que preparamos en <code>supabase/schema.sql</code> en el <strong>SQL Editor</strong> de tu panel de Supabase.
            </li>
          </ol>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={copyEnvSnippet}>
            {copied ? '✓ Copiado' : 'Copiar formato .env.local'}
          </Button>
          <Button onClick={handleTestConnection} disabled={testing}>
            {testing ? 'Comprobando...' : 'Probar conexión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
