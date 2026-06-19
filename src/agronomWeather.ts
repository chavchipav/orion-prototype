// ─────────────────────────────────────────────────────────────
// Агро-метео движок (вдохновлён набором Visual Crossing Agriculture):
// производные агрономические индексы из прогноза — DeltaT/влажный термометр
// (опрыскивание), ET₀ и влагобаланс, GDD по культуре, профиль почвы по глубине,
// риски (жара/болезни/заморозки). Прогноз берём из планировщика — единый источник.
// Все цифры — демо-прототип, но формулы честные.
// ─────────────────────────────────────────────────────────────
import { FORECAST, type DayWx } from './agronomPlanner'
import type { Crop, FieldStatus } from './agronomData'

// ── точечные формулы ──
// точка росы (Magnus)
export function dewPoint(t: number, rh: number): number {
  const a = 17.27, b = 237.7
  const g = (a * t) / (b + t) + Math.log(Math.max(1, rh) / 100)
  return Math.round(((b * g) / (a - g)) * 10) / 10
}
// влажный термометр (аппроксимация Stull)
export function wetBulb(t: number, rh: number): number {
  const wb = t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(t + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035
  return Math.round(wb * 10) / 10
}
// Delta T = сухой − влажный термометр (скорость испарения; ключ к окну опрыскивания)
export function deltaT(t: number, rh: number): number {
  return Math.round((t - wetBulb(t, rh)) * 10) / 10
}
// ET₀ по Харгривзу (mm/сут): 0.0023 · Ra · (Tср+17.8) · √(Tmax−Tmin); Ra≈16.7 mm (47°N, июль)
export function et0(tMax: number, tMin: number): number {
  const tMean = (tMax + tMin) / 2
  return Math.round(0.0023 * 16.7 * (tMean + 17.8) * Math.sqrt(Math.max(0, tMax - tMin)) * 10) / 10
}

// рейтинг Delta T для опрыскивания
export type DtRate = 'идеально' | 'на грани' | 'нельзя'
export function dtRate(dt: number): DtRate {
  if (dt >= 2 && dt <= 8) return 'идеально'
  if (dt > 8 && dt <= 10) return 'на грани'
  return 'нельзя' // <2: инверсия/снос; >10: пересыхание капли
}
export function dtColor(r: DtRate) { return r === 'идеально' ? '#2da84f' : r === 'на грани' ? '#e0900a' : '#e5302a' }

// ── расширенный день прогноза со всеми деривативами ──
export type WxDay = DayWx & {
  tMean: number; dew: number; wetBulb: number; deltaT: number; dtRate: DtRate
  et0: number; solar: number; soilT10: number; soilM: number
  heat: boolean; frost: boolean; diseaseRisk: boolean; leafWetH: number
}

export const DAILY: WxDay[] = (() => {
  let soilM = 21 // влагозапас в корнеобитаемом слое, % (старт)
  return FORECAST.map((w) => {
    const tMean = Math.round((w.tMax + w.tMin) / 2)
    const E = et0(w.tMax, w.tMin)
    // влагобаланс почвы: приход осадки, расход ET₀; простая «бочка» 8..32%
    soilM = Math.max(8, Math.min(32, soilM + w.rainMm * 0.55 - E * 0.9))
    const dew = dewPoint(tMean, w.humidity)
    const wb = wetBulb(tMean, w.humidity)
    const dt = Math.round((tMean - wb) * 10) / 10
    const solar = w.rainMm > 1 ? 14 : w.humidity < 45 ? 29 : 23 // МДж/м²
    const soilT10 = Math.round((tMean - 1.5) * 10) / 10
    // часы листового увлажнения за ночь (роса/высокая влажность)
    const leafWetH = w.clearNight ? 7 : w.humidity >= 65 ? 11 : w.rainMm > 1 ? 13 : 4
    return {
      ...w, tMean, dew, wetBulb: wb, deltaT: dt, dtRate: dtRate(dt),
      et0: E, solar, soilT10, soilM: Math.round(soilM),
      heat: wb >= 24 || w.tMax >= 33,
      frost: w.tMin <= 2,
      diseaseRisk: leafWetH >= 10 && tMean >= 15 && tMean <= 26,
      leafWetH,
    }
  })
})()

// окно опрыскивания дня: учитываем DeltaT + ветер + инверсию (ночь)
export function sprayRating(d: WxDay): { rate: DtRate; note: string } {
  if (d.rainMm > 1) return { rate: 'нельзя', note: 'осадки' }
  if (d.windDay > 5) return { rate: 'нельзя', note: `ветер ${d.windDay} м/с` }
  if (d.dtRate === 'нельзя') return { rate: 'нельзя', note: d.deltaT < 2 ? `ΔT ${d.deltaT} — инверсия/снос` : `ΔT ${d.deltaT} — пересыхание` }
  return { rate: d.dtRate, note: `ΔT ${d.deltaT}, ветер ${d.windDay} м/с` }
}

// ── GDD по культуре: база, накоплено к «сегодня», лестница фаз ──
type GddStage = { name: string; gdd: number }
const BASE: Record<Crop, number> = {
  'Подсолнечник': 8, 'Кукуруза': 10, 'Соя': 10, 'Озимая пшеница': 5, 'Яровой ячмень': 5, 'Горох': 4, 'Пар': 10,
}
const ACCUM: Partial<Record<Crop, number>> = { // Σ активных температур к 07.07 (демо-правдоподобно)
  'Подсолнечник': 1240, 'Кукуруза': 1080, 'Соя': 980, 'Озимая пшеница': 1760, 'Яровой ячмень': 1320, 'Горох': 1180,
}
const STAGES: Partial<Record<Crop, GddStage[]>> = {
  'Подсолнечник': [{ name: 'Всходы', gdd: 120 }, { name: '2–3 пары листьев', gdd: 450 }, { name: 'Бутонизация', gdd: 900 }, { name: 'Цветение', gdd: 1250 }, { name: 'Налив', gdd: 1700 }, { name: 'Созревание', gdd: 2100 }],
  'Кукуруза': [{ name: 'Всходы', gdd: 120 }, { name: '5–7 листьев', gdd: 450 }, { name: 'Выметывание', gdd: 950 }, { name: 'Цветение', gdd: 1150 }, { name: 'Налив зерна', gdd: 1500 }, { name: 'Восковая спелость', gdd: 1950 }],
  'Соя': [{ name: 'Всходы', gdd: 130 }, { name: 'Ветвление', gdd: 480 }, { name: 'Цветение', gdd: 900 }, { name: 'Налив бобов', gdd: 1300 }, { name: 'Созревание', gdd: 1800 }],
  'Озимая пшеница': [{ name: 'Выход в трубку', gdd: 900 }, { name: 'Колошение', gdd: 1300 }, { name: 'Цветение', gdd: 1500 }, { name: 'Налив', gdd: 1750 }, { name: 'Восковая спелость', gdd: 2000 }],
}
export type GddTrack = {
  crop: Crop; base: number; accum: number
  stages: (GddStage & { reached: boolean })[]
  current?: string; next?: GddStage; toNext?: number; etaDays?: number
}
export function gddTrack(crop: Crop): GddTrack {
  const base = BASE[crop] ?? 10
  const accum = ACCUM[crop] ?? 1000
  const list = STAGES[crop] ?? []
  const stages = list.map((s) => ({ ...s, reached: accum >= s.gdd }))
  const current = [...stages].reverse().find((s) => s.reached)?.name
  const next = list.find((s) => accum < s.gdd)
  let toNext: number | undefined, etaDays: number | undefined
  if (next) {
    toNext = next.gdd - accum
    // прогноз накопления: средний GDD/сут по прогнозу
    const perDay = DAILY.reduce((s, d) => s + Math.max(0, d.tMean - base), 0) / DAILY.length || 1
    etaDays = Math.ceil(toNext / perDay)
  }
  return { crop, base, accum, stages, current, next, toNext, etaDays }
}

// ── профиль почвы по глубине ──
export const SOIL_PROFILE = (() => {
  const d0 = DAILY[0]
  const depths = [{ cm: 5, dt: 0.5, dm: -3 }, { cm: 10, dt: -1, dm: 0 }, { cm: 20, dt: -2.5, dm: 3 }, { cm: 50, dt: -5, dm: 6 }, { cm: 100, dt: -8, dm: 8 }]
  return depths.map((x) => ({ cm: x.cm, temp: Math.round((d0.tMean + x.dt) * 10) / 10, moisture: Math.max(8, Math.min(34, Math.round(d0.soilM + x.dm))) }))
})()

// история 14 дней (для графиков «температура/осадки/ET₀» и аномалии к норме)
export type HistDay = { d: string; t: number; rain: number; et0: number; norm: number }
export const HISTORY: HistDay[] = (() => {
  const seed = [
    { t: 30, rain: 0 }, { t: 31, rain: 0 }, { t: 33, rain: 0 }, { t: 34, rain: 0 }, { t: 29, rain: 3 },
    { t: 27, rain: 8 }, { t: 28, rain: 0 }, { t: 31, rain: 0 }, { t: 33, rain: 0 }, { t: 34, rain: 0 },
    { t: 35, rain: 0 }, { t: 32, rain: 0 }, { t: 33, rain: 0 }, { t: 34, rain: 0 },
  ]
  return seed.map((x, i) => ({ d: `${String(23 + i > 30 ? 23 + i - 30 : 23 + i).padStart(2, '0')}.0${23 + i > 30 ? 7 : 6}`, t: x.t, rain: x.rain, et0: et0(x.t, x.t - 13), norm: 27 }))
})()
// сезонная аномалия (демо): теплее и суше нормы
export const ANOMALY = { tempC: +2.4, rainPct: -38, gtk: 0.46, droughtNote: 'Дефицит влаги: осадков −38% к норме, ГТК 0.46 < 0.5 (засуха)' }

// помесячно: факт сезона vs климатическая норма (демо-правдоподобно, Ростовская обл.)
export type MonthRow = { m: string; tFact: number; tNorm: number; rainFact: number; rainNorm: number }
export const MONTHLY: MonthRow[] = [
  { m: 'Апр', tFact: 11.5, tNorm: 9.8, rainFact: 22, rainNorm: 38 },
  { m: 'Май', tFact: 19.4, tNorm: 16.2, rainFact: 30, rainNorm: 48 },
  { m: 'Июн', tFact: 25.1, tNorm: 21.0, rainFact: 24, rainNorm: 60 },
  { m: 'Июл', tFact: 30.2, tNorm: 24.3, rainFact: 9, rainNorm: 52 },
]

// ── влагообеспеченность поля (для слоя карты): % доступной влаги ──
export function fieldMoisture(ndvi: number, status: FieldStatus): number {
  const base = status === 'risk' ? 13 : status === 'warn' ? 18 : 23
  return Math.round(Math.max(9, Math.min(30, base + (ndvi - 0.5) * 6)))
}
// цвет: сухо (низкая) — коричневый/красный → влажно (высокая) — синий
export function moistureColor(m: number): string {
  const t = Math.max(0, Math.min(1, (m - 10) / 20))
  const L = (a: number, b: number, k: number) => Math.round(a + (b - a) * k)
  if (t < 0.5) { const k = t / 0.5; return `rgb(${L(176, 216, k)},${L(106, 194, k)},${L(46, 122, k)})` } // коричневый→песочный
  const k = (t - 0.5) / 0.5; return `rgb(${L(216, 59, k)},${L(194, 143, k)},${L(122, 181, k)})` // песочный→синий
}
