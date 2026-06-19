// ─────────────────────────────────────────────────────────────
// Сезон поля: генератор агрономического состояния поля во времени.
// Замыкает цикл «план → мониторинг → проблема → решение → факт → эффект → ROI»
// и память поля по сезонам. Данные сидированы по (field.id + year) — детерминированы.
// Все цифры — демо-данные прототипа.
// ─────────────────────────────────────────────────────────────
import { type AgField, type Crop, type FieldStatus } from './agronomData'
import { TECHCARDS, RECOMMENDATIONS, ROTATION, type TechOp } from './agronomData2'
import { mulberry32, hash } from './utils'

// «сегодня» в прототипе — снимок 7 июля 2026
export const TODAY = '07.07'

// ── сидированный PRNG (копия mulberry32, в agronomData он не экспортирован) ──

// 'DD.MM' → день года (для сравнения сроков / lag)
function doy(d: string): number {
  const [dd, mm] = d.split('.').map(Number)
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return cum[mm - 1] + dd
}
function addDays(d: string, n: number): string {
  const cum = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let [dd, mm] = d.split('.').map(Number)
  dd += n
  while (dd > cum[mm - 1]) { dd -= cum[mm - 1]; mm++; if (mm > 12) mm = 1 }
  return `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}`
}

// ── Фенология по культурам: стадия, дата, доля от пика NDVI, критичность ──
export type Pheno = { stage: string; date: string; ndviK: number; critical?: boolean }
export const PHENOLOGY: Record<Crop, Pheno[]> = {
  'Озимая пшеница': [
    { stage: 'Сев', date: '05.10', ndviK: 0.15 }, { stage: 'Всходы', date: '20.10', ndviK: 0.30 },
    { stage: 'Кущение (осень)', date: '10.11', ndviK: 0.42 }, { stage: 'Перезимовка', date: '15.01', ndviK: 0.22 },
    { stage: 'Возобновление вегетации', date: '22.03', ndviK: 0.45 }, { stage: 'Выход в трубку', date: '20.04', ndviK: 0.70 },
    { stage: 'Колошение', date: '15.05', ndviK: 0.92, critical: true }, { stage: 'Цветение', date: '25.05', ndviK: 1.0, critical: true },
    { stage: 'Налив', date: '15.06', ndviK: 0.85 }, { stage: 'Восковая спелость', date: '02.07', ndviK: 0.55 },
    { stage: 'Уборка', date: '12.07', ndviK: 0.30 },
  ],
  'Подсолнечник': [
    { stage: 'Сев', date: '28.04', ndviK: 0.15 }, { stage: 'Всходы', date: '12.05', ndviK: 0.30 },
    { stage: '2–3 пары листьев', date: '28.05', ndviK: 0.50 }, { stage: 'Бутонизация', date: '18.06', ndviK: 0.80, critical: true },
    { stage: 'Цветение', date: '05.07', ndviK: 1.0, critical: true }, { stage: 'Налив', date: '25.07', ndviK: 0.85 },
    { stage: 'Созревание', date: '20.08', ndviK: 0.50 }, { stage: 'Уборка', date: '15.09', ndviK: 0.28 },
  ],
  'Кукуруза': [
    { stage: 'Сев', date: '02.05', ndviK: 0.15 }, { stage: 'Всходы', date: '16.05', ndviK: 0.32 },
    { stage: '5–7 листьев', date: '05.06', ndviK: 0.55 }, { stage: 'Выметывание/цветение', date: '10.07', ndviK: 1.0, critical: true },
    { stage: 'Налив зерна', date: '05.08', ndviK: 0.88 }, { stage: 'Восковая спелость', date: '01.09', ndviK: 0.55 },
    { stage: 'Уборка', date: '25.09', ndviK: 0.30 },
  ],
  'Соя': [
    { stage: 'Сев', date: '08.05', ndviK: 0.15 }, { stage: 'Всходы', date: '22.05', ndviK: 0.32 },
    { stage: 'Ветвление', date: '15.06', ndviK: 0.60 }, { stage: 'Цветение', date: '10.07', ndviK: 0.95, critical: true },
    { stage: 'Налив бобов', date: '05.08', ndviK: 0.90 }, { stage: 'Созревание', date: '05.09', ndviK: 0.50 },
    { stage: 'Уборка', date: '25.09', ndviK: 0.28 },
  ],
  'Яровой ячмень': [
    { stage: 'Сев', date: '10.04', ndviK: 0.15 }, { stage: 'Всходы', date: '24.04', ndviK: 0.32 },
    { stage: 'Кущение', date: '12.05', ndviK: 0.55 }, { stage: 'Колошение', date: '02.06', ndviK: 0.92, critical: true },
    { stage: 'Налив', date: '20.06', ndviK: 0.80 }, { stage: 'Уборка', date: '10.07', ndviK: 0.30 },
  ],
  'Горох': [
    { stage: 'Сев', date: '05.04', ndviK: 0.15 }, { stage: 'Всходы', date: '18.04', ndviK: 0.34 },
    { stage: 'Бутонизация', date: '15.05', ndviK: 0.70 }, { stage: 'Цветение', date: '28.05', ndviK: 0.95, critical: true },
    { stage: 'Налив', date: '15.06', ndviK: 0.78 }, { stage: 'Уборка', date: '05.07', ndviK: 0.30 },
  ],
  'Пар': [
    { stage: 'Ранневесенняя обработка', date: '25.04', ndviK: 0.20 }, { stage: 'Летние культивации', date: '20.06', ndviK: 0.22 },
    { stage: 'Влагонакопление', date: '20.08', ndviK: 0.20 },
  ],
}

// ── шаблоны проблем по культуре ──
type ProblemTpl = { name: string; kind: string; phase: string; product: string }
const PROBLEM_BY_CROP: Record<Crop, ProblemTpl | null> = {
  'Озимая пшеница': { name: 'Фузариоз колоса', kind: 'Болезнь', phase: 'Цветение', product: 'Прозаро 0,8 л/га' },
  'Подсолнечник': { name: 'Заразиха', kind: 'Сорняк-паразит', phase: 'Бутонизация', product: 'Сапфир-КЛ + система Clearfield' },
  'Кукуруза': { name: 'Луговой мотылёк', kind: 'Вредитель', phase: '5–7 листьев', product: 'Децис Эксперт 0,125 л/га' },
  'Соя': { name: 'Пероноспороз', kind: 'Болезнь', phase: 'Цветение', product: 'Прозаро 0,8 л/га' },
  'Яровой ячмень': { name: 'Сетчатая пятнистость', kind: 'Болезнь', phase: 'Колошение', product: 'Инпут 0,6 л/га' },
  'Горох': { name: 'Гороховая зерновка', kind: 'Вредитель', phase: 'Цветение', product: 'Децис Эксперт 0,125 л/га' },
  'Пар': { name: 'Многолетние сорняки', kind: 'Сорняк', phase: 'Летние культивации', product: 'Глифосат 3 л/га' },
}

// экономика культуры (экспортируется для расчёта ЭПВ — см. epvData.ts)
export const YIELD_BASE: Record<Crop, number> = { 'Озимая пшеница': 6.0, 'Подсолнечник': 3.0, 'Кукуруза': 8.4, 'Соя': 2.5, 'Яровой ячмень': 4.5, 'Горох': 2.8, 'Пар': 0 }
export const PRICE: Record<Crop, number> = { 'Озимая пшеница': 14000, 'Подсолнечник': 35000, 'Кукуруза': 12000, 'Соя': 40000, 'Яровой ячмень': 11000, 'Горох': 16000, 'Пар': 0 }

export type ProblemStatus = 'открыта' | 'обработка' | 'закрыта' | 'рецидив'
export type SeasonProblem = {
  name: string; kind: string; phase: string; openedDate: string; dev: string; spread: number
  status: ProblemStatus; product: string; treatmentDate?: string; effect: string; recSource?: string
}
export type SeasonOp = { block: string; name: string; phase?: string; plannedDate: string; actualDate?: string; status: 'План' | 'Факт'; lagDays?: number; products?: { name: string; norm: number; unit: string }[] }
export type SeasonEconomics = { costPerHa: number; savedYield: number; savedValuePerHa: number; fieldSaved: number; roi: number; atRisk: boolean } | null
export type FieldSeason = {
  year: number; crop: Crop; sort: string
  phases: (Pheno & { done: boolean; current: boolean })[]
  ndviSeries: { stage: string; ndvi: number }[]
  peak: number; currentStage: string
  problems: SeasonProblem[]
  ops: SeasonOp[]
  yield: { plan: number; fact: number; unit: string; harvested: boolean }
  economics: SeasonEconomics
  riskFlags: string[]
}

// дата-узел для операции по блоку/фазе
function opDate(phases: Pheno[], op: TechOp): string {
  if (op.phase) { const p = phases.find((x) => x.stage === op.phase); if (p) return p.date }
  const byBlock: Record<string, number> = { 'Почвообработка': 0, 'Сев': 0, 'Защита растений': 5, 'Питание': 4, 'Уборка': phases.length - 1 }
  if (op.block === 'Сев') { const p = phases.find((x) => x.stage === 'Сев'); if (p) return p.date }
  if (op.block === 'Уборка') return phases[phases.length - 1].date
  const idx = Math.min(phases.length - 1, byBlock[op.block] ?? 3)
  return phases[idx].date
}

export function fieldSeason(field: AgField, year: number): FieldSeason {
  const rnd = mulberry32(hash(field.id + ':' + year))
  const phases0 = PHENOLOGY[field.crop]
  const isCurrent = year === 2026
  const todayD = isCurrent ? doy(TODAY) : 400 // прошлые сезоны полностью завершены

  // пик NDVI: для текущего сезона якорим на снимок поля, для прошлых — слегка варьируем
  const peak = field.crop === 'Пар' ? 0.24
    : Math.max(0.52, Math.min(0.86, (isCurrent ? field.ndvi + 0.08 : field.ndvi + 0.02 + (rnd() - 0.5) * 0.12)))

  const phases = phases0.map((p) => {
    const done = doy(p.date) <= todayD
    return { ...p, done, current: false }
  })
  // текущая фаза — последняя пройденная
  let curIdx = phases.reduce((acc, p, i) => (p.done ? i : acc), 0)
  if (!isCurrent) curIdx = phases.length - 1
  phases.forEach((p, i) => (p.current = i === curIdx))
  const currentStage = phases[curIdx].stage

  const ndviSeries = phases0.map((p) => ({ stage: p.stage, ndvi: Math.round((peak * p.ndviK + (rnd() - 0.5) * 0.03) * 100) / 100 }))

  // ── проблема + жизненный цикл ──
  const tpl = PROBLEM_BY_CROP[field.crop]
  const problems: SeasonProblem[] = []
  if (tpl && field.crop !== 'Пар') {
    const phaseDate = (phases0.find((x) => x.stage === tpl.phase) || phases0[Math.floor(phases0.length / 2)]).date
    let status: ProblemStatus
    if (!isCurrent) status = rnd() < 0.25 ? 'рецидив' : 'закрыта'
    else status = field.status === 'risk' ? (rnd() < 0.25 ? 'рецидив' : 'открыта') : field.status === 'warn' ? 'обработка' : 'закрыта'
    const treated = status !== 'открыта'
    const treatmentDate = treated ? addDays(phaseDate, 3 + Math.floor(rnd() * 5)) : undefined
    const dev = field.status === 'risk' ? 'Сильное' : field.status === 'warn' ? 'Среднее' : 'Слабое'
    const spread = field.status === 'risk' ? 12 + Math.floor(rnd() * 20) : field.status === 'warn' ? 5 + Math.floor(rnd() * 8) : 2 + Math.floor(rnd() * 4)
    const effect = status === 'закрыта' ? 'NDVI восстановился — потери предотвращены'
      : status === 'обработка' ? 'Обработка проведена, ждём отклика NDVI'
        : status === 'рецидив' ? 'Эффект частичный — нужна повторная обработка'
          : 'Требует решения: окно обработки закрывается'
    const rec = RECOMMENDATIONS.find((r) => r.field === field.name)
    problems.push({ name: tpl.name, kind: tpl.kind, phase: tpl.phase, openedDate: phaseDate, dev, spread, status, product: rec?.product || tpl.product, treatmentDate, effect, recSource: rec?.text })

    // провал NDVI в фазе проблемы (визуальное доказательство; восстановление если пролечено)
    const pidx = phases0.findIndex((x) => x.stage === tpl.phase)
    if (pidx >= 0) {
      const sev = dev === 'Сильное' ? 0.18 : dev === 'Среднее' ? 0.1 : 0.05
      for (let i = pidx; i < ndviSeries.length; i++) {
        const dist = i - pidx
        const recover = treated ? Math.max(0, 1 - dist * 0.5) : 1 // пролечено — восстановление за ~2 фазы
        const drop = sev * (dist === 0 ? 1 : dist === 1 ? 0.9 : 0.6) * recover
        ndviSeries[i] = { ...ndviSeries[i], ndvi: Math.round(ndviSeries[i].ndvi * (1 - drop) * 100) / 100 }
      }
    }
  }

  // ── операции план/факт ──
  const card = TECHCARDS.find((t) => t.crop === field.crop)
  const ops: SeasonOp[] = (card?.ops || []).map((op) => {
    const plannedDate = opDate(phases0, op)
    const isFact = op.status === 'Факт' || (isCurrent && doy(plannedDate) <= todayD - 4)
    let actualDate: string | undefined, lagDays: number | undefined
    if (isFact) { lagDays = Math.floor(rnd() * 7) - 1; actualDate = addDays(plannedDate, lagDays) }
    return { block: op.block, name: op.name, phase: op.phase, plannedDate, actualDate, status: isFact ? 'Факт' : 'План', lagDays, products: op.products }
  })

  // ── урожай план/факт ──
  const base = YIELD_BASE[field.crop]
  const factor = field.status === 'ok' ? 0.98 + rnd() * 0.08 : field.status === 'warn' ? 0.88 + rnd() * 0.09 : 0.72 + rnd() * 0.13
  const harvested = !isCurrent || doy(phases0[phases0.length - 1].date) <= todayD
  const plan = Math.round(base * 10) / 10
  const fact = base > 0 ? Math.round(base * factor * 10) / 10 : 0
  const yieldObj = { plan, fact, unit: 'т/га', harvested }

  // ── экономика защиты (ROI) ──
  let economics: SeasonEconomics = null
  const prob = problems[0]
  if (prob && base > 0) {
    const lossPct = prob.dev === 'Сильное' ? 0.13 : prob.dev === 'Среднее' ? 0.09 : 0.05
    const savedYield = Math.round(base * lossPct * 100) / 100
    const costPerHa = field.crop === 'Подсолнечник' ? 2600 : 1500 + Math.floor(rnd() * 600)
    const price = PRICE[field.crop]
    const savedValuePerHa = Math.round(savedYield * price)
    const fieldSaved = Math.round(savedValuePerHa * field.areaHa)
    economics = { costPerHa, savedYield, savedValuePerHa, fieldSaved, roi: Math.round((savedValuePerHa / costPerHa) * 10) / 10, atRisk: prob.status === 'открыта' }
  }

  // ── риск-флаги ──
  const riskFlags: string[] = []
  const lateOp = ops.find((o) => (o.lagDays || 0) > 4)
  if (lateOp) riskFlags.push(`Отставание по срокам: ${lateOp.name} (+${lateOp.lagDays} дн)`)
  if (prob && (prob.status === 'открыта' || prob.status === 'рецидив')) riskFlags.push(`Открытая проблема: ${prob.name}`)
  if (field.status === 'risk' && field.crop !== 'Пар') riskFlags.push('Засушливый стресс по NDVI')
  if (field.predecessor === field.crop) riskFlags.push(`Севооборот: повтор по культуре «${field.crop}»`)

  return { year, crop: field.crop, sort: field.sort, phases, ndviSeries, peak, currentStage, problems, ops, yield: yieldObj, economics, riskFlags }
}

// ── память поля: сводка по сезонам 2024–2026 ──
const RC: Crop[] = ['Озимая пшеница', 'Подсолнечник', 'Кукуруза', 'Соя', 'Яровой ячмень', 'Горох', 'Пар']
function cropForYear(field: AgField, year: number): Crop {
  const rot = ROTATION.find((r) => r.field === field.name)
  const hit = rot?.years.find((y) => y.year === year)
  if (hit) return hit.crop
  if (year === 2026) return field.crop
  const h = hash(field.id) + (2026 - year)
  return RC[h % RC.length]
}
// поле «как если бы» под культурой севооборота этого года (для прошлых сезонов)
export function seasonField(field: AgField, year: number): AgField {
  if (year === 2026) return field
  return { ...field, crop: cropForYear(field, year), status: pseudoStatus(field.id, year) }
}
export type SeasonSummary = { year: number; crop: Crop; yieldPlan: number; yieldFact: number; keyProblem: string; problemStatus: ProblemStatus | '—'; roi: number | null; fieldSaved: number }
export function fieldSeasonHistory(field: AgField): SeasonSummary[] {
  return [2024, 2025, 2026].map((year) => {
    const pf = seasonField(field, year)
    const s = fieldSeason(pf, year)
    const prob = s.problems[0]
    return {
      year, crop: pf.crop, yieldPlan: s.yield.plan, yieldFact: s.yield.fact,
      keyProblem: prob ? prob.name : '—', problemStatus: prob ? prob.status : '—',
      roi: s.economics ? s.economics.roi : null, fieldSaved: s.economics ? s.economics.fieldSaved : 0,
    }
  })
}
function pseudoStatus(id: string, year: number): FieldStatus {
  const r = mulberry32(hash(id + 'st' + year))()
  return r < 0.25 ? 'risk' : r < 0.55 ? 'warn' : 'ok'
}
