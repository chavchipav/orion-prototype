// Превью-примитивы для списков полей (G2): мини-контур поля + NDVI-спарклайн.
// Цель — glanceability: «по картинке за 10 секунд видно, где плешь, куда ехать».
import { thumbPath, type LatLng } from './MapKit'
import { mulberry32, hash } from '../utils'

type Status = 'ok' | 'warn' | 'risk'
const HEX: Record<Status, string> = { ok: '#2da84f', warn: '#e0900a', risk: '#e5302a' }

// мини-контур поля (форма из реального ring), залит цветом статуса
export function FieldThumb({ ring, status, w = 38, h = 30 }: { ring: LatLng[]; status: Status; w?: number; h?: number }) {
  const c = HEX[status]
  if (!ring || ring.length < 3) {
    return <span className="inline-block rounded-md shrink-0" style={{ width: w, height: h, background: c + '22', border: `1px solid ${c}55` }} />
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polygon points={thumbPath(ring, w, h, 3)} fill={c + '33'} stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  )
}

// детерминированный 7-дневный ряд NDVI, заканчивается на текущем значении;
// тренд по статусу: risk — падает, warn — колеблется, ok — слегка растёт
export function ndviSeries(seedStr: string, end: number, status: Status, n = 7): number[] {
  const rnd = mulberry32(hash(seedStr + '|ndvi'))
  const slope = status === 'risk' ? 0.018 : status === 'warn' ? 0.004 : -0.01 // назад во времени
  const out: number[] = []
  let v = end
  for (let i = 0; i < n; i++) {
    out.unshift(+v.toFixed(3))
    v = Math.max(0.1, Math.min(0.9, v + slope + (rnd() - 0.5) * 0.02))
  }
  return out
}

// мини-тренд: линия + лёгкая заливка, цвет = направление (вниз красный / вверх зелёный)
export function Sparkline({ values, w = 56, h = 22, color }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (!values.length) return null
  const min = Math.min(...values), max = Math.max(...values)
  const span = Math.max(1e-3, max - min)
  const dx = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [i * dx, h - 3 - ((v - min) / span) * (h - 6)] as const)
  const rising = values[values.length - 1] >= values[0]
  const c = color || (rising ? '#2da84f' : '#e5302a')
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polygon points={area} fill={c} opacity={0.1} />
      <polyline points={line} fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={c} />
    </svg>
  )
}
