// ─────────────────────────────────────────────────────────────
// АгроМон-grade данные кабинета агронома. Хозяйство «Хлеборобное»,
// Ростовская обл. Поля — РЕАЛЬНЫЕ контуры пашни из OSM (landuse=farmland),
// см. agronomFieldsGeo.ts (генерируется scripts/fetchFields.mjs).
// ─────────────────────────────────────────────────────────────
import { GEO_FIELDS, GEO_CENTER, GEO_BOUNDS } from './agronomFieldsGeo'
import { mulberry32 } from './utils'

export type Crop = 'Озимая пшеница' | 'Подсолнечник' | 'Кукуруза' | 'Соя' | 'Яровой ячмень' | 'Горох' | 'Пар'
export type FieldStatus = 'ok' | 'warn' | 'risk'
export type LatLng = [number, number]

export type AgField = {
  id: string
  name: string
  crop: Crop
  sort: string
  areaHa: number
  ndvi: number
  ndviCV: number      // вариативность NDVI внутри поля (σ/mean) — сигнал неоднородности
  status: FieldStatus
  predecessor: string
  ring: LatLng[]
  alert?: string
}

// порог однородности: выше → кандидат на дифференцированное внесение
export const NDVI_CV_THRESHOLD = 0.15
export function cvStatus(cv: number): FieldStatus {
  return cv >= 0.18 ? 'risk' : cv >= 0.12 ? 'warn' : 'ok'
}

// ── Региональный бенчмарк NDVI по культуре (ров #5/#11) ──────────
// Спутниковый слой по полям Зимовниковского района: распределение
// текущего NDVI по культуре (p25 / медиана / p75). Детерминированный мок.
export type RegionNdvi = { p25: number; median: number; p75: number }
export const REGION_NDVI: Record<Crop, RegionNdvi> = {
  'Озимая пшеница': { p25: 0.58, median: 0.66, p75: 0.74 },
  'Подсолнечник': { p25: 0.55, median: 0.63, p75: 0.71 },
  'Кукуруза': { p25: 0.60, median: 0.68, p75: 0.76 },
  'Соя': { p25: 0.52, median: 0.60, p75: 0.68 },
  'Яровой ячмень': { p25: 0.54, median: 0.62, p75: 0.70 },
  'Горох': { p25: 0.50, median: 0.58, p75: 0.66 },
  'Пар': { p25: 0.15, median: 0.20, p75: 0.25 },
}
export function regionBenchmark(crop: Crop): RegionNdvi {
  return REGION_NDVI[crop]
}
// Δ NDVI поля к медиане района, %.
export function ndviVsRegion(ndvi: number, crop: Crop): number {
  const m = REGION_NDVI[crop].median
  return m > 0 ? Math.round((ndvi / m - 1) * 100) : 0
}

// ── Внутриполевые NDVI-зоны (точное земледелие, ров #4) ─────────
// Нарезаем bbox поля на сетку, оставляем ячейки внутри контура, каждой
// присваиваем зональный NDVI (диагональный градиент + сидированный шум,
// разброс ~ ndviCV) и классифицируем (низкая/средняя/высокая зона).
export type ZoneLevel = 'low' | 'mid' | 'high'
export type FieldZone = { ring: LatLng[]; ndvi: number; level: ZoneLevel }

function pointInRing(lat: number, lng: number, ring: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1]
    if (((xi > lng) !== (xj > lng)) && (lat < (yj - yi) * (lng - xi) / (xj - xi) + yi)) inside = !inside
  }
  return inside
}

export function fieldZones(ring: LatLng[], ndvi: number, ndviCV: number, cols = 7, rows = 7): FieldZone[] {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const [la, ln] of ring) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln) }
  const dLat = (maxLat - minLat) / rows, dLng = (maxLng - minLng) / cols
  const sigma = ndvi * ndviCV
  const rnd = mulberry32(Math.abs(Math.round((minLat + minLng) * 1e4)))
  const out: FieldZone[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const la0 = minLat + r * dLat, la1 = la0 + dLat, ln0 = minLng + c * dLng, ln1 = ln0 + dLng
    if (!pointInRing((la0 + la1) / 2, (ln0 + ln1) / 2, ring)) continue
    const grad = ((c / (cols - 1) + r / (rows - 1)) / 2 - 0.5) // -0.5..0.5 по диагонали
    const noise = rnd() - 0.5
    const z = Math.max(0.12, Math.min(0.92, ndvi + (grad * 1.4 + noise * 0.7) * sigma * 2))
    const level: ZoneLevel = z < ndvi - sigma * 0.5 ? 'low' : z > ndvi + sigma * 0.5 ? 'high' : 'mid'
    out.push({ ring: [[la0, ln0], [la0, ln1], [la1, ln1], [la1, ln0]], ndvi: Math.round(z * 100) / 100, level })
  }
  return out
}

// Разбивка площади поля по зонам (га на уровень).
export function zoneAreas(zones: FieldZone[], areaHa: number): Record<ZoneLevel, { cells: number; ha: number; pct: number }> {
  const total = zones.length || 1
  const mk = (lvl: ZoneLevel) => { const cells = zones.filter((z) => z.level === lvl).length; return { cells, ha: Math.round(areaHa * cells / total * 10) / 10, pct: Math.round((cells / total) * 100) } }
  return { low: mk('low'), mid: mk('mid'), high: mk('high') }
}

export const CROP_COLORS: Record<Crop, string> = {
  'Озимая пшеница': '#2e9e57',
  'Подсолнечник': '#b653b0',
  'Кукуруза': '#e0a92b',
  'Соя': '#3f7fd6',
  'Яровой ячмень': '#cdbb3a',
  'Горох': '#5fc7c2',
  'Пар': '#9a9a9a',
}

const CROPS: Crop[] = ['Озимая пшеница', 'Подсолнечник', 'Кукуруза', 'Соя', 'Яровой ячмень', 'Горох', 'Пар']
const SORTS: Record<string, string[]> = {
  'Озимая пшеница': ['Гром', 'Алексеич', 'Таня'],
  'Подсолнечник': ['Гелиос-310', 'НК Брио', 'Сурус'],
  'Кукуруза': ['Краснодарский 291', 'ДКС 4014'],
  'Соя': ['Селекта 201', 'Билявка'],
  'Яровой ячмень': ['Вакула', 'Грис'],
  'Горох': ['Альтаир', 'Старт'],
  'Пар': ['—'],
}

// seeded PRNG (mulberry32) — стабильные «случайные» поля

const CENTER: LatLng = GEO_CENTER // центр кластера реальных полей (Зимовники, Ростовская обл.)

// Атрибуты (культура/NDVI/статус) присваиваются детерминированно (seeded PRNG)
// поверх РЕАЛЬНОЙ геометрии контура; ring и areaHa — из OSM (agronomFieldsGeo.ts).
function genFields(): AgField[] {
  const rnd = mulberry32(42)
  return GEO_FIELDS.map((g, i) => {
    const n = i + 1
    const crop = CROPS[Math.floor(rnd() * CROPS.length)]
    const ndvi = crop === 'Пар' ? 0.18 + rnd() * 0.08 : 0.32 + rnd() * 0.52
    const status: FieldStatus = ndvi < 0.42 ? 'risk' : ndvi < 0.58 ? 'warn' : 'ok'
    const sorts = SORTS[crop]
    // вариативность NDVI: независимый PRNG, чтобы не сдвигать распределение культур/NDVI;
    // выше для проблемных полей (огрехи/низины/очаги дают разброс ДО просадки среднего)
    const cvBase = status === 'risk' ? 0.18 : status === 'warn' ? 0.12 : 0.05
    const ndviCV = Math.round((cvBase + mulberry32(917 + i)() * 0.08) * 1000) / 1000
    return {
      id: 'f' + n,
      name: 'ХБ' + String(n).padStart(2, '0'),
      crop,
      sort: sorts[Math.floor(rnd() * sorts.length)],
      areaHa: g.areaHa,
      ndvi: Math.round(ndvi * 100) / 100,
      ndviCV,
      status,
      predecessor: CROPS[Math.floor(rnd() * CROPS.length)],
      ring: g.ring as LatLng[],
      alert: status === 'risk' ? (crop === 'Подсолнечник' ? 'Очаг заразихи на ЮВ' : 'Падение NDVI 4-й день, засуха')
        : status === 'warn' ? 'Неоднородность по NDVI' : undefined,
    }
  })
}

export const AG_FIELDS = genFields()
export const AG_CENTER = CENTER
export const AG_BOUNDS = GEO_BOUNDS

export const FARM = {
  name: 'Хлеборобное',
  region: 'Ростовская обл.',
  totalHa: Math.round(AG_FIELDS.reduce((s, f) => s + f.areaHa, 0)),
  fieldsCount: AG_FIELDS.length,
  user: 'Лосик Дмитрий',
}

// сводка по культурам (для легенды снизу, как в АгроМон)
export const CROP_SUMMARY = (() => {
  const m = new Map<Crop, number>()
  for (const f of AG_FIELDS) m.set(f.crop, (m.get(f.crop) || 0) + f.areaHa)
  return [...m.entries()].map(([crop, ha]) => ({ crop, ha: Math.round(ha) })).sort((a, b) => b.ha - a.ha)
})()

// ── NDVI цвет (как контрастный NDVI: красный→жёлтый→зелёный) ──
export function ndviColor(v: number): string {
  // 0.2 .. 0.85
  const t = Math.max(0, Math.min(1, (v - 0.25) / 0.55))
  if (t < 0.5) {
    const k = t / 0.5 // red→yellow
    return `rgb(${210 + 30 * k | 0},${60 + 150 * k | 0},40)`
  }
  const k = (t - 0.5) / 0.5 // yellow→green
  return `rgb(${240 - 180 * k | 0},${210 - 40 * k | 0},${40 + 30 * k | 0})`
}

export function statusColor(s: FieldStatus) {
  return s === 'ok' ? '#2da84f' : s === 'warn' ? '#e0900a' : '#e5302a'
}

// ── Осмотры (скаутинг) ──
export type Inspection = {
  id: string; fieldId: string; date: string; phase: string
  problems: { kind: string; name: string; dev: string; spread: number }[]
  agronom: string; alarm: boolean
}
export const INSPECTIONS: Inspection[] = AG_FIELDS.filter((f) => f.status !== 'ok').slice(0, 6).map((f, i) => ({
  id: 'i' + i,
  fieldId: f.id,
  date: ['12 июля', '10 июля', '8 июля', '5 июля', '3 июля', '1 июля'][i] || '1 июля',
  phase: f.crop === 'Озимая пшеница' ? 'Колошение' : f.crop === 'Подсолнечник' ? 'Бутонизация' : 'Вегетация',
  problems: f.crop === 'Подсолнечник'
    ? [{ kind: 'Сорняк', name: 'Заразиха', dev: 'Сильное', spread: 18 }]
    : f.crop === 'Озимая пшеница'
      ? [{ kind: 'Болезнь', name: 'Фузариоз колоса', dev: 'Среднее', spread: 5 }]
      : [{ kind: 'Вредитель', name: 'Луговой мотылёк', dev: 'Слабое', spread: 8 }],
  agronom: ['Пётр И.', 'Сергей К.', 'Пётр И.'][i % 3],
  alarm: f.status === 'risk',
}))

export const SEASONS = ['Сезон 2026', 'Сезон 2025', 'Сезон 2024']
