import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-3.5">
      <div>
        <h1 className="text-[26px] font-bold leading-none tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
