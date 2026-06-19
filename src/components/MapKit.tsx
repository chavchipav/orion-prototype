// ─────────────────────────────────────────────────────────────
// MapKit — общий визуальный язык карт (агроном · владелец · семеновод).
// Один и тот же набор контролов/легенды на всех кабинетах; функционал
// и данные у каждого кабинета свои.
// ─────────────────────────────────────────────────────────────
import { useEffect, type ReactNode } from 'react'
import { useMap } from 'react-leaflet'
import type { Map as LMap } from 'leaflet'
import { Plus, Minus, Maximize, Layers } from 'lucide-react'

export type LatLng = [number, number]

// фит карты по границам кластера полей при маунте — общий для всех карт
export function FitBounds({ bounds, padding = 40 }: { bounds: [LatLng, LatLng]; padding?: number }) {
  const map = useMap()
  useEffect(() => { map.fitBounds(bounds, { padding: [padding, padding] }) }, []) // eslint-disable-line
  return null
}

// общий bbox по кольцам полей → границы для fitBounds
export function ringsBounds(rings: LatLng[][]): [LatLng, LatLng] | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  let any = false
  for (const r of rings) for (const [la, ln] of r) {
    any = true
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la)
    minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln)
  }
  return any ? [[minLat, minLng], [maxLat, maxLng]] : null
}

// миниатюра поля (svg-полигон) для списков — единый вид во всех кабинетах
export function thumbPath(ring: LatLng[], w = 40, h = 28, pad = 3): string {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const [la, ln] of ring) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln) }
  const sx = (w - 2 * pad) / Math.max(1e-6, maxLng - minLng)
  const sy = (h - 2 * pad) / Math.max(1e-6, maxLat - minLat)
  return ring.map(([la, ln]) => `${pad + (ln - minLng) * sx},${pad + (maxLat - la) * sy}`).join(' ')
}

const BTN = 'w-9 h-9 grid place-items-center bg-white/95 backdrop-blur hover:bg-white text-ink transition'

// вертикальный блок кнопок управления картой: +, −, «показать все»
export function ZoomBar({ map, onFit, className = '' }: { map: LMap | null; onFit?: () => void; className?: string }) {
  return (
    <div className={`absolute z-[500] flex flex-col rounded-xl overflow-hidden shadow-lg border border-line ${className}`}>
      <button onClick={() => map?.zoomIn()} title="Приблизить" className={`${BTN} border-b border-line`}><Plus size={16} /></button>
      <button onClick={() => map?.zoomOut()} title="Отдалить" className={`${BTN} ${onFit ? 'border-b border-line' : ''}`}><Minus size={16} /></button>
      {onFit && <button onClick={onFit} title="Показать все поля" className={BTN}><Maximize size={15} /></button>}
    </div>
  )
}

// белая полупрозрачная панель-оверлей (легенда/фильтр/детали) — единый стиль
export function OverlayCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`absolute z-[500] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-line ${className}`}>{children}</div>
}

// нижний бар слоёв карты — общий контейнер
export function LayerBar({ children }: { children: ReactNode }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl px-4 py-2 shadow-lg border border-line">
      {children}
    </div>
  )
}

// переключатель слоёв (Снимок/NDVI/…) — единый стиль во всех кабинетах
export function LayerToggle<T extends string>({ options, value, onChange }: {
  options: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2 shrink-0 items-center">
      <Layers size={13} className="text-muted" />
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={`text-xs font-semibold ${value === k ? 'text-brand' : 'text-muted hover:text-ink'}`}>{l}</button>
      ))}
    </div>
  )
}

// градиент-легенда NDVI (ниже→выше) — общий
export function NdviLegend() {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-[10px] text-muted">ниже</span>
      <span className="h-2 w-24 rounded" style={{ background: 'linear-gradient(90deg,#d23c28,#f0d228,#3c9e46)' }} />
      <span className="text-[10px] text-muted">выше</span>
    </div>
  )
}
