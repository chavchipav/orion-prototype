// ─────────────────────────────────────────────────────────────
// Честный «field-tested»: бейдж выдаётся ТОЛЬКО при прослеживаемом
// источнике из НАШИХ платформенных данных (двухфакторные опыты Trials).
// Дельта берётся из реального разложения дисперсии (analyze), а не из seed.
// Товары без следа бейджа не получают — только отзывы фермеров.
// ─────────────────────────────────────────────────────────────
import { TRIALS, analyze, type Trial, type TrialResult } from './agronomTrials'

export type FieldTrace = {
  tested: boolean
  trials: number       // на основе N опытов
  plots: number        // делянок в опыте
  deltaT: number       // прибавка драйвера, т/га (из разбора дисперсии)
  driverPct: number    // вклад драйвера в дисперсию, %
  basis: string        // напр. «удобрение × сорт»
  trialName: string; crop: string; field: string; year: number
}

const NO_TRACE: FieldTrace = { tested: false, trials: 0, plots: 0, deltaT: 0, driverPct: 0, basis: '', trialName: '', crop: '', field: '', year: 0 }

// предрасчёт разбора по опытам (один раз)
const RESULTS: { t: Trial; res: TrialResult }[] = TRIALS.map((t) => ({ t, res: analyze(t) }))

export type TraceItem = { cat: string; name: string; ai?: string; detail?: string; crop?: string }

function matches(item: TraceItem, t: Trial): boolean {
  const s = `${item.name} ${item.ai || ''} ${item.detail || ''}`.toLowerCase()
  if (item.cat === 'Удобрения' && t.factorA.name === 'Удобрение')
    return /n\s?\d|p\s?\d|npk|селитр|аммофос|карбамид|нитроаммо|диаммо|сульфоаммо|азот|фосфор|калий|сульфат/i.test(s)
  if (item.cat === 'СЗР' && t.factorA.name === 'Система защиты')
    return /имазам|имидазолин|clearfield|клеарфилд|евро.?лайтнинг|сапфир|express|экспресс|трибенурон|тифенсульфурон/i.test(s)
  return false
}

export function fieldTested(item: TraceItem): FieldTrace {
  const hit = RESULTS.find(({ t }) => matches(item, t))
  if (!hit) return NO_TRACE
  const { t, res } = hit
  const driver = res.contributions[0].pct >= res.contributions[1].pct ? res.contributions[0] : res.contributions[1]
  const means = (driver.name === t.factorA.name ? res.meansA : res.meansB).map((m) => m.mean)
  const deltaT = Math.round((Math.max(...means) - Math.min(...means)) * 100) / 100
  return {
    tested: true, trials: 1,
    plots: t.reps * t.factorA.levels.length * t.factorB.levels.length,
    deltaT, driverPct: driver.pct,
    basis: `${t.factorA.name.toLowerCase()} × ${t.factorB.name.toLowerCase()}`,
    trialName: t.name, crop: t.crop, field: t.field, year: t.year,
  }
}
