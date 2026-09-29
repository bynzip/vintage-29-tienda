import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warn' | 'bad' | 'neutral'

const TONE_STYLES: Record<StatusTone, string> = {
  ok: 'border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warn: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400',
  bad: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400',
  neutral: 'border-transparent bg-muted text-foreground'
}

interface StatusBadgeProps {
  tone?: StatusTone
  className?: string
  children: React.ReactNode
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ tone = 'neutral', className, children }) => {
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', TONE_STYLES[tone], className)}>
      {children}
    </Badge>
  )
}
