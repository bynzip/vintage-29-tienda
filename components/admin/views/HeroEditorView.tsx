'use client'

import React, { useState } from 'react'
import { HeroSlide, SlideZone, SlideType, TextAlignment } from '@/lib/admin/types'
import { useData } from '@/lib/admin/data-context'
import { SectionHeader } from '@/components/admin/ui/SectionHeader'
import { StatusBadge } from '@/components/admin/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const ZONE_INFO = {
  main: {
    title: 'Portada principal',
    desc: 'Video o imagen grande que se ve primero al entrar a la tienda.',
    note: 'Vista previa en formato 16:9. Si hay varios elementos, la tienda los muestra en carrusel.'
  },
  sub: {
    title: 'Sub portadas',
    desc: 'Bloques más pequeños debajo de la portada, por ejemplo para categorías u ofertas destacadas.',
    note: 'Vista previa de los bloques en cuadrícula. El bloque seleccionado tiene un borde resaltado.'
  }
}

export const HeroEditorView: React.FC = () => {
  const { slides, updateSlides } = useData()
  const [currentZone, setCurrentZone] = useState<SlideZone>('main')
  const [selectedId, setSelectedId] = useState<number | string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const zoneSlides = slides.filter(s => s.zone === currentZone)
  const activeSlide = zoneSlides.find(s => s.id === selectedId) || zoneSlides[0] || null

  const handleSelectZone = (zone: SlideZone) => {
    setCurrentZone(zone)
    const firstInZone = slides.find(s => s.zone === zone)
    setSelectedId(firstInZone ? firstInZone.id : null)
  }

  const handleAddSlide = (type: SlideType) => {
    const newSlide: HeroSlide = {
      id: Date.now(),
      type,
      zone: currentZone,
      title: type === 'video' ? 'Nuevo video' : 'Nueva imagen',
      subtitle: '',
      button_text: 'Ver más',
      link_url: '/catalogo',
      media_url: '',
      overlay_opacity: 40,
      alignment: currentZone === 'sub' ? 'center' : 'left',
      is_published: false,
      order_index: slides.length
    }
    const updated = [...slides, newSlide]
    updateSlides(updated)
    setSelectedId(newSlide.id)
  }

  const handleUpdateActiveField = (field: keyof HeroSlide, value: unknown) => {
    if (!activeSlide) return
    const updated = slides.map(s => {
      if (s.id === activeSlide.id) {
        return { ...s, [field]: value }
      }
      return s
    })
    updateSlides(updated)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeSlide) return

    if (activeSlide.type === 'video') {
      const url = URL.createObjectURL(file)
      handleUpdateActiveField('media_url', url)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        handleUpdateActiveField('media_url', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteActive = () => {
    if (!activeSlide) return
    const updated = slides.filter(s => s.id !== activeSlide.id)
    updateSlides(updated)
    const remainingInZone = updated.filter(s => s.zone === currentZone)
    setSelectedId(remainingInZone[0]?.id || null)
  }

  const handleMove = (direction: 'up' | 'down') => {
    if (!activeSlide) return
    const currentIdx = zoneSlides.findIndex(s => s.id === activeSlide.id)
    if (direction === 'up' && currentIdx <= 0) return
    if (direction === 'down' && currentIdx >= zoneSlides.length - 1) return

    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    const targetSlide = zoneSlides[targetIdx]

    const updated = [...slides]
    const idxA = updated.findIndex(s => s.id === activeSlide.id)
    const idxB = updated.findIndex(s => s.id === targetSlide.id)
    const temp = updated[idxA]
    updated[idxA] = updated[idxB]
    updated[idxB] = temp

    updateSlides(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    await updateSlides(slides)
    setIsSaving(false)
    setSaveMessage('✓ Cambios guardados correctamente.')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  return (
    <div>
      <SectionHeader title="Portada web" subtitle="Edita lo que ven tus clientas al entrar a la tienda">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </SectionHeader>

      {saveMessage && <div className="mb-3.5 text-[13.5px] font-semibold text-emerald-600 dark:text-emerald-400">{saveMessage}</div>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Zona de la portada">
            <Button
              variant="outline"
              aria-pressed={currentZone === 'main'}
              className={cn(currentZone === 'main' && 'bg-primary text-primary-foreground hover:bg-primary/90')}
              onClick={() => handleSelectZone('main')}
            >
              Portada principal
            </Button>
            <Button
              variant="outline"
              aria-pressed={currentZone === 'sub'}
              className={cn(currentZone === 'sub' && 'bg-primary text-primary-foreground hover:bg-primary/90')}
              onClick={() => handleSelectZone('sub')}
            >
              Sub portadas
            </Button>
          </div>

          <h2 className="text-lg font-semibold">{ZONE_INFO[currentZone].title}</h2>
          <p className="mb-4 mt-1 text-[13px] text-muted-foreground">{ZONE_INFO[currentZone].desc}</p>

          <ul className="mb-4 grid list-none gap-2 p-0">
            {zoneSlides.length > 0 ? (
              zoneSlides.map((slide) => (
                <li key={slide.id}>
                  <button
                    type="button"
                    aria-current={activeSlide?.id === slide.id}
                    onClick={() => setSelectedId(slide.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg border bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-muted',
                      activeSlide?.id === slide.id && 'border-foreground bg-muted ring-1 ring-foreground'
                    )}
                  >
                    <StatusBadge>{slide.type === 'video' ? '🎬 Video' : '🖼️ Imagen'}</StatusBadge>
                    <span className="flex-1 font-medium">{slide.title || 'Sin título'}</span>
                    {!slide.is_published && <StatusBadge tone="warn">Oculto</StatusBadge>}
                  </button>
                </li>
              ))
            ) : (
              <li className="py-9 text-center text-sm text-muted-foreground">Aún no hay elementos en esta sección.</li>
            )}
          </ul>

          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleAddSlide('video')}>
              + Agregar video
            </Button>
            <Button variant="outline" onClick={() => handleAddSlide('banner')}>
              + Agregar imagen
            </Button>
          </div>

          {activeSlide ? (
            <div className="border-t pt-[18px]">
              <div className="mb-3.5 grid gap-1.5">
                <Label htmlFor="p-file">
                  {activeSlide.type === 'video' ? 'Archivo de video (MP4 o WebM)' : 'Imagen (JPG, PNG o WebP)'}
                </Label>
                <input
                  id="p-file"
                  type="file"
                  accept={activeSlide.type === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileUpload}
                  className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                <span className="text-[13px] text-muted-foreground">
                  {activeSlide.media_url ? 'Archivo o URL cargado.' : 'Aún no subiste un archivo.'}
                </span>
              </div>

              <div className="mb-3.5 grid gap-1.5">
                <Label htmlFor="p-url">O pega la dirección URL del recurso</Label>
                <Input
                  id="p-url"
                  type="url"
                  placeholder="https://..."
                  value={activeSlide.media_url}
                  onChange={(e) => handleUpdateActiveField('media_url', e.target.value)}
                />
              </div>

              <div className="mb-3.5 grid gap-1.5">
                <Label htmlFor="p-title">Título</Label>
                <Input id="p-title" type="text" value={activeSlide.title} onChange={(e) => handleUpdateActiveField('title', e.target.value)} />
              </div>

              <div className="mb-3.5 grid gap-1.5">
                <Label htmlFor="p-sub">Subtítulo</Label>
                <Input id="p-sub" type="text" value={activeSlide.subtitle} onChange={(e) => handleUpdateActiveField('subtitle', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="p-btn">Texto del botón</Label>
                  <Input id="p-btn" type="text" value={activeSlide.button_text} onChange={(e) => handleUpdateActiveField('button_text', e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p-link">Enlace de destino</Label>
                  <Input id="p-link" type="text" value={activeSlide.link_url} onChange={(e) => handleUpdateActiveField('link_url', e.target.value)} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="p-al">Alineación del texto</Label>
                  <select
                    id="p-al"
                    value={activeSlide.alignment}
                    onChange={(e) => handleUpdateActiveField('alignment', e.target.value as TextAlignment)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="p-ov">
                    Oscurecer fondo: <strong>{activeSlide.overlay_opacity}%</strong>
                  </Label>
                  <input
                    id="p-ov"
                    type="range"
                    min="0"
                    max="80"
                    value={activeSlide.overlay_opacity}
                    onChange={(e) => handleUpdateActiveField('overlay_opacity', Number(e.target.value))}
                    className="h-10 w-full"
                  />
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <input
                    type="checkbox"
                    checked={activeSlide.is_published}
                    onChange={(e) => handleUpdateActiveField('is_published', e.target.checked)}
                  />
                  Publicado en la tienda
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMove('up')} title="Subir en la lista" aria-label="Subir en la lista">
                    ↑
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleMove('down')} title="Bajar en la lista" aria-label="Bajar en la lista">
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    onClick={handleDeleteActive}
                    title="Eliminar este elemento"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-9 text-center text-sm text-muted-foreground">Selecciona o agrega un elemento para editar.</p>
          )}
        </Card>

        <div className="lg:sticky lg:top-20">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13.5px] font-semibold">Vista previa en tiempo real</span>
            <span className="text-xs text-muted-foreground">Tienda Vintage 29</span>
          </div>

          <div className={currentZone === 'sub' ? 'grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]' : ''} aria-label="Vista previa">
            {currentZone === 'sub' ? (
              zoneSlides.map(slide => (
                <PreviewTile key={slide.id} slide={slide} isSelected={slide.id === activeSlide?.id} compact onClick={() => setSelectedId(slide.id)} />
              ))
            ) : activeSlide ? (
              <PreviewTile slide={activeSlide} isSelected={false} />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-[#3d2b24] to-[#7a5a4c] text-white">
                No hay portada configurada
              </div>
            )}
          </div>

          <p className="mt-2.5 text-[13px] text-muted-foreground">{ZONE_INFO[currentZone].note}</p>
        </div>
      </div>
    </div>
  )
}

interface PreviewTileProps {
  slide: HeroSlide
  isSelected: boolean
  compact?: boolean
  onClick?: () => void
}

const PreviewTile: React.FC<PreviewTileProps> = ({ slide, isSelected, compact, onClick }) => {
  const alignItems =
    slide.alignment === 'left' ? 'flex-start' : slide.alignment === 'right' ? 'flex-end' : 'center'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl bg-gradient-to-br from-[#3d2b24] to-[#7a5a4c] shadow',
        compact ? 'aspect-[4/3] cursor-pointer' : 'aspect-video',
        isSelected && 'outline outline-2 outline-offset-2 outline-blue-500'
      )}
    >
      {slide.media_url ? (
        slide.type === 'video' ? (
          <video src={slide.media_url} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
        ) : (
          <img src={slide.media_url} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">Sin archivo multimedia</div>
      )}

      <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(0, 0, 0, ${slide.overlay_opacity / 100})` }} />

      <div
        className={cn('absolute inset-0 z-[2] flex flex-col justify-center gap-2 text-white', compact ? 'p-[10%]' : 'p-[8%]')}
        style={{ textAlign: slide.alignment, alignItems }}
      >
        <h2 className={cn('m-0 font-semibold leading-tight tracking-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]', compact ? 'text-[clamp(15px,1.8vw,20px)]' : 'text-[clamp(18px,3.2vw,32px)]')}>
          {slide.title || 'Título de ejemplo'}
        </h2>
        {slide.subtitle && (
          <p className={cn('m-0 opacity-95 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]', compact ? 'text-xs' : 'text-[clamp(13px,1.5vw,15px)]')}>
            {slide.subtitle}
          </p>
        )}
        {slide.button_text && (
          <span className={cn('mt-1.5 inline-block self-start rounded-lg bg-white font-semibold text-[#111] shadow', compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13.5px]')}>
            {slide.button_text}
          </span>
        )}
      </div>
    </div>
  )
}
