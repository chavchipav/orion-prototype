// R&D-агрегат «сорт × климатзоны»: распределение урожайности гибрида по зонам,
// поведение засуха vs норма, бенчмарк против района и репрезентативность (n полей).
// Детерминированно (seeded PRNG на name+zone) на базе HYBRIDS.proven + REGION_SUNFLOWER.
import { HYBRIDS, ZONES } from './seedData'
import { REGION_SUNFLOWER } from './seedDossierData'
import { mulberry32, hash } from './utils'


export const REP_MIN = 20 // порог репрезентативности (меньше — «мало данных, не доказательно»)

export type ZoneStat = {
  zone: string
  hasData: boolean
  n: number            // число полей под гибридом в зоне (репрезентативность)
  mean: number         // средняя урожайность гибрида, т/га
  median: number
  p25: number; p75: number   // разброс по полям
  regMedian: number; regP75: number; regN: number  // район (спутниковый слой)
  deltaPct: number     // % к медиане района
  droughtYield: number // средняя в засушливый год
  normalYield: number  // средняя в благоприятный год
  stability: number    // 0..1 — устойчивость (1 − провал в засуху)
}

export function zoneStats(hybridName: string): ZoneStat[] {
  const h = HYBRIDS.find((x) => x.name === hybridName)
  return ZONES.map((zone) => {
    const reg = REGION_SUNFLOWER[zone]
    const proven = h?.proven.find((p) => p.zone === zone)
    const base = { zone, regMedian: reg?.median ?? 0, regP75: reg?.p75 ?? 0, regN: reg?.n ?? 0 }
    if (!h || !proven) return { ...base, hasData: false, n: 0, mean: 0, median: 0, p25: 0, p75: 0, deltaPct: 0, droughtYield: 0, normalYield: 0, stability: 0 }
    const rnd = mulberry32(hash(hybridName + '|' + zone))
    const mean = proven.yield
    const cv = 0.07 + (5 - h.drought) * 0.025          // засухоустойчивый → теснее разброс
    const spread = mean * cv
    const jitter = (rnd() - 0.5) * spread * 0.5
    const median = +(mean + jitter * 0.3).toFixed(2)
    const p25 = +(mean - spread + jitter).toFixed(2)
    const p75 = +(mean + spread + jitter).toFixed(2)
    const dGap = mean * (0.04 + (5 - h.drought) * 0.045) // в засуху недобор тем больше, чем ниже drought
    const droughtYield = +(mean - dGap).toFixed(2)
    const normalYield = +(mean + mean * 0.06).toFixed(2)
    const stability = +(1 - (normalYield - droughtYield) / normalYield).toFixed(2)
    const deltaPct = reg ? Math.round((mean / reg.median - 1) * 100) : 0
    return { ...base, hasData: true, n: proven.fields, mean, median, p25, p75, deltaPct, droughtYield, normalYield, stability }
  })
}

export type MatrixCell = { hybrid: string; zone: string; hasData: boolean; n: number; mean: number; deltaPct: number }
export function portfolioMatrix(): { hybrids: string[]; zones: string[]; cells: MatrixCell[][] } {
  return {
    hybrids: HYBRIDS.map((h) => h.name),
    zones: [...ZONES],
    cells: HYBRIDS.map((h) => zoneStats(h.name).map((s) => ({ hybrid: h.name, zone: s.zone, hasData: s.hasData, n: s.n, mean: s.mean, deltaPct: s.deltaPct }))),
  }
}

// цвет силы гибрида по Δ% к медиане района (красный → жёлтый → зелёный)
export function strengthColor(deltaPct: number, hasData = true): string {
  if (!hasData) return '#ececed'
  if (deltaPct >= 20) return '#1f9d55'
  if (deltaPct >= 8) return '#62b56f'
  if (deltaPct >= 0) return '#e0c200'
  if (deltaPct >= -10) return '#e0900a'
  return '#e5302a'
}

// сводная репрезентативность портфеля
export function repSummary(hybridName: string): { totalN: number; zonesWithData: number; weakZones: string[] } {
  const stats = zoneStats(hybridName).filter((s) => s.hasData)
  return {
    totalN: stats.reduce((s, z) => s + z.n, 0),
    zonesWithData: stats.length,
    weakZones: stats.filter((z) => z.n < REP_MIN).map((z) => z.zone),
  }
}

// ── U4: первичка — список полей под гибридом в зоне (drill-down из R&D) ──
const FARMS = ['КФХ Доброполье', 'Агро «Сальский»', 'ООО «Кубань-Олео»', 'КФХ Прикумье', 'ООО «Хопёр-Агро»',
  'Агрофирма «Придонье»', 'КФХ Маныч', 'ООО «Зерно Юга»', 'КФХ Дон-Степь', 'Агрохолдинг «Прикубанский»',
  'КФХ Егорлык', 'ООО «Поволжская Нива»', 'КФХ Степной Ветер', 'Агрофирма «Калач»']
const RIVALS = ['Pioneer P64LE25', 'Syngenta SY', 'NK Брио', 'Limagrain', 'контроль (стандарт)']
export type FieldMethod = 'бункерный вес' | 'обмолот (элеватор)' | 'оценка агронома'
export type FieldRecord = {
  farm: string; year: number; seasonType: 'засуха' | 'норма'
  yield: number; method: FieldMethod; control: boolean; rival?: string
  moisture: number; weeds: number; reliable: boolean
}

// детерминированный список первички (для drill-down). cap — сколько строк показать.
export function fieldRecords(hybridName: string, zone: string, cap = 14): FieldRecord[] {
  const h = HYBRIDS.find((x) => x.name === hybridName)
  const proven = h?.proven.find((p) => p.zone === zone)
  if (!h || !proven) return []
  const rnd = mulberry32(hash('fields|' + hybridName + '|' + zone))
  const n = Math.min(proven.fields, cap)
  const cv = 0.07 + (5 - h.drought) * 0.025
  return Array.from({ length: n }, () => {
    const seasonType = rnd() < 0.5 ? 'засуха' : 'норма'
    const year = seasonType === 'засуха' ? 2025 : 2024
    const seasonFactor = seasonType === 'засуха' ? 1 - (6 - h.drought) * 0.05 : 1 + 0.06
    const yld = +(proven.yield * seasonFactor * (1 + (rnd() - 0.5) * cv)).toFixed(1)
    const m = rnd()
    const method: FieldMethod = m < 0.45 ? 'бункерный вес' : m < 0.8 ? 'обмолот (элеватор)' : 'оценка агронома'
    const control = rnd() < 0.6
    const reliable = method !== 'оценка агронома' && control
    return {
      farm: pick(rnd, FARMS), year, seasonType, yield: yld, method, control,
      rival: control ? pick(rnd, RIVALS) : undefined,
      moisture: +(6 + rnd() * 2).toFixed(1), weeds: +(0.5 + rnd() * 1.1).toFixed(1), reliable,
    }
  })
}
function pick<T>(rnd: () => number, arr: T[]): T { return arr[Math.floor(rnd() * arr.length)] }

// «надёжная» медиана — только бункерный вес/обмолот + контроль рядом
export function reliableMedian(recs: FieldRecord[]): { value: number | null; n: number } {
  const ok = recs.filter((r) => r.reliable).map((r) => r.yield).sort((a, b) => a - b)
  if (!ok.length) return { value: null, n: 0 }
  const mid = Math.floor(ok.length / 2)
  return { value: ok.length % 2 ? ok[mid] : +((ok[mid - 1] + ok[mid]) / 2).toFixed(1), n: ok.length }
}

// ── U6: валидация «прогноз vs факт» (backtesting точности оценки урожайности) ──
export type Backtest = {
  n: number; mae: number; mape: number; ndviCorr: number; coverageSeasons: number
  bySeason: { type: 'засуха' | 'норма'; mape: number; n: number }[]
  points: { prognosis: number; actual: number; seasonType: 'засуха' | 'норма' }[]
}
export function backtest(): Backtest {
  const rnd = mulberry32(hash('backtest-2026'))
  const pts: { prognosis: number; actual: number; seasonType: 'засуха' | 'норма' }[] = []
  for (let i = 0; i < 212; i++) {
    const seasonType: 'засуха' | 'норма' = rnd() < 0.42 ? 'засуха' : 'норма'
    const actual = +( (seasonType === 'засуха' ? 14 : 26) + (rnd() - 0.5) * 8 ).toFixed(1)
    // спутник завышает в засуху (стресс): больше ошибка и смещение вверх
    const bias = seasonType === 'засуха' ? 1 + (rnd() * 0.18) : 1 + (rnd() - 0.5) * 0.12
    const prognosis = +(actual * bias).toFixed(1)
    pts.push({ prognosis, actual, seasonType })
  }
  const err = pts.map((p) => Math.abs(p.prognosis - p.actual))
  const mae = +(err.reduce((s, e) => s + e, 0) / pts.length).toFixed(2)
  const mape = +(pts.reduce((s, p) => s + Math.abs(p.prognosis - p.actual) / p.actual, 0) / pts.length * 100).toFixed(1)
  const bySeason = (['засуха', 'норма'] as const).map((t) => {
    const sub = pts.filter((p) => p.seasonType === t)
    return { type: t, n: sub.length, mape: +(sub.reduce((s, p) => s + Math.abs(p.prognosis - p.actual) / p.actual, 0) / sub.length * 100).toFixed(1) }
  })
  return { n: pts.length, mae, mape, ndviCorr: 0.62, coverageSeasons: 3, bySeason, points: pts.filter((_, i) => i % 4 === 0) }
}
