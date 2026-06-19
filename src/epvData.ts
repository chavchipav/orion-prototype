// ─────────────────────────────────────────────────────────────
// ЭПВ (экономический порог вредоносности) + денежная оценка потери.
// Превращает «есть проблема» в решение «обрабатывать ли сейчас»:
// факт распространения vs порог → потенциальная потеря (т/га и ₽).
// Потеря согласована с экономикой сезона (YIELD_BASE × PRICE из agronomSeason).
// ─────────────────────────────────────────────────────────────
import { type Crop } from './agronomData'
import { YIELD_BASE, PRICE } from './agronomSeason'

export type EpvRule = {
  threshold: number    // порог вредоносности, % распространения
  unit: string         // подпись единицы факта/порога
  lossPerPP: number    // доля урожая, теряемая на 1 п.п. распространения
  maxLoss: number      // потолок доли потерь
  note: string         // справочный якорь
}

// Пороги по типу проблемы (problem.kind). Заразиха — крайне низкий порог.
export const EPV: Record<string, EpvRule> = {
  'Болезнь': { threshold: 15, unit: '% распр.', lossPerPP: 0.008, maxLoss: 0.30, note: 'ЭПВ листостебельных болезней' },
  'Вредитель': { threshold: 10, unit: '% заселения', lossPerPP: 0.011, maxLoss: 0.35, note: 'ЭПВ по заселённости вредителем' },
  'Сорняк': { threshold: 20, unit: '% засор.', lossPerPP: 0.006, maxLoss: 0.40, note: 'ЭПВ малолетних сорняков' },
  'Сорняк-паразит': { threshold: 5, unit: '% пораж.', lossPerPP: 0.030, maxLoss: 0.50, note: 'ЭПВ заразихи — низкий порог' },
}
const DEFAULT_RULE: EpvRule = { threshold: 15, unit: '%', lossPerPP: 0.008, maxLoss: 0.30, note: 'ЭПВ (общий)' }

export type EpvResult = {
  threshold: number
  unit: string
  fact: number
  exceeded: boolean
  lossTPerHa: number   // потенциальная потеря, т/га
  lossTotalT: number   // потеря на поле, т
  lossRub: number      // потеря на поле, ₽
  note: string
}

// fact — фактическое распространение проблемы, % (problem.spread).
export function epvDecision(kind: string, crop: Crop, fact: number, areaHa: number): EpvResult {
  const r = EPV[kind] ?? DEFAULT_RULE
  const exceeded = fact >= r.threshold
  const lossFrac = Math.min(r.maxLoss, Math.max(0, fact) * r.lossPerPP)
  const lossTPerHa = +(YIELD_BASE[crop] * lossFrac).toFixed(2)
  const lossTotalT = +(lossTPerHa * areaHa).toFixed(1)
  const lossRub = Math.round(lossTotalT * PRICE[crop])
  return { threshold: r.threshold, unit: r.unit, fact, exceeded, lossTPerHa, lossTotalT, lossRub, note: r.note }
}

export function rubShort(n: number): string {
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн ₽' : Math.round(n).toLocaleString('ru-RU') + ' ₽'
}
