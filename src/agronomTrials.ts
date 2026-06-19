import { mulberry32 } from './utils'
// ─────────────────────────────────────────────────────────────
// «Опыты» — полевые эксперименты агронома → решение (вместо «таблицы в Excel
// и устного вывода»). Двухфакторный опыт с повторностями; по урожаю делянок
// ЧЕСТНО считается двухфакторное разложение дисперсии (SS) → вклад каждого
// фактора в %, средние по уровням и фраза-решение. Данные — демо-прототип.
// ─────────────────────────────────────────────────────────────


export type Plot = { rep: number; aLevel: string; bLevel: string; yield: number }
export type FactorContribution = { name: string; ss: number; pct: number; df: number }
export type TrialResult = {
  contributions: FactorContribution[] // A, B, A×B, остаток
  grand: number
  meansA: { level: string; mean: number }[]
  meansB: { level: string; mean: number }[]
  bestA: string; bestB: string
  decision: string
}
export type Trial = {
  id: string; name: string; crop: string; field: string; year: number
  factorA: { name: string; levels: string[]; unit: string }
  factorB: { name: string; levels: string[] }
  reps: number; plotAreaHa: number
  // эффекты уровней (т/га) — «истина», по которой генерим делянки; анализ их НЕ знает
  aEffect: number[]; bEffect: number[]; base: number; noise: number; seed: number
}

// Главный опыт — пример Димы: соя, удобрение × сорт, ~80 делянок.
// Вклад удобрения должен выйти кратно больше сорта (считается из данных).
export const TRIALS: Trial[] = [
  {
    id: 'tr-soy', name: 'Двухфакторный: удобрение × сорт', crop: 'Соя', field: 'ХБ08', year: 2026,
    factorA: { name: 'Удобрение', levels: ['Контроль', 'N60', 'N60+P40', 'N60+P40+S'], unit: 'кг д.в./га' },
    factorB: { name: 'Сорт', levels: ['Селекта 201', 'Билявка', 'Аннушка', 'Сибириада'] },
    reps: 5, plotAreaHa: 0.2,
    base: 2.30, aEffect: [0, 0.42, 0.66, 0.74], bEffect: [0, 0.06, 0.09, 0.03], noise: 0.42, seed: 4021,
  },
  {
    id: 'tr-sun', name: 'Двухфакторный: гербицидная система × густота', crop: 'Подсолнечник', field: 'ХБ02', year: 2025,
    factorA: { name: 'Система защиты', levels: ['Классика', 'Clearfield', 'Express'], unit: '' },
    factorB: { name: 'Густота', levels: ['45 тыс/га', '55 тыс/га', '65 тыс/га'] },
    reps: 6, plotAreaHa: 0.2,
    base: 2.60, aEffect: [0, 0.28, 0.22], bEffect: [0, 0.14, 0.05], noise: 0.30, seed: 7720,
  },
]

// генерим делянки: yield = base + A + B + взаимодействие(малое) + шум
export function plotsOf(t: Trial): Plot[] {
  const rnd = mulberry32(t.seed)
  const out: Plot[] = []
  for (let r = 0; r < t.reps; r++)
    for (let a = 0; a < t.factorA.levels.length; a++)
      for (let b = 0; b < t.factorB.levels.length; b++) {
        const interaction = (a > 0 && b > 0 ? (rnd() - 0.5) * 0.05 : 0)
        const y = t.base + t.aEffect[a] + t.bEffect[b] + interaction + (rnd() - 0.5) * 2 * t.noise
        out.push({ rep: r + 1, aLevel: t.factorA.levels[a], bLevel: t.factorB.levels[b], yield: Math.round(y * 100) / 100 })
      }
  return out
}

// двухфакторное разложение суммы квадратов (честно, по делянкам)
export function analyze(t: Trial): TrialResult {
  const plots = plotsOf(t)
  const A = t.factorA.levels, B = t.factorB.levels, r = t.reps
  const grand = plots.reduce((s, p) => s + p.yield, 0) / plots.length
  const meanA = A.map((lv) => avg(plots.filter((p) => p.aLevel === lv).map((p) => p.yield)))
  const meanB = B.map((lv) => avg(plots.filter((p) => p.bLevel === lv).map((p) => p.yield)))
  const meanCell = (ai: number, bi: number) => avg(plots.filter((p) => p.aLevel === A[ai] && p.bLevel === B[bi]).map((p) => p.yield))

  const SSA = r * B.length * sum(meanA.map((m) => (m - grand) ** 2))
  const SSB = r * A.length * sum(meanB.map((m) => (m - grand) ** 2))
  let SSAB = 0, SSE = 0
  for (let ai = 0; ai < A.length; ai++) for (let bi = 0; bi < B.length; bi++) {
    const mc = meanCell(ai, bi)
    SSAB += r * (mc - meanA[ai] - meanB[bi] + grand) ** 2
    SSE += sum(plots.filter((p) => p.aLevel === A[ai] && p.bLevel === B[bi]).map((p) => (p.yield - mc) ** 2))
  }
  const SST = SSA + SSB + SSAB + SSE
  const pct = (ss: number) => Math.round((ss / SST) * 1000) / 10
  const contributions: FactorContribution[] = [
    { name: t.factorA.name, ss: SSA, pct: pct(SSA), df: A.length - 1 },
    { name: t.factorB.name, ss: SSB, pct: pct(SSB), df: B.length - 1 },
    { name: `${t.factorA.name} × ${t.factorB.name}`, ss: SSAB, pct: pct(SSAB), df: (A.length - 1) * (B.length - 1) },
    { name: 'Остаток (случайность)', ss: SSE, pct: pct(SSE), df: plots.length - A.length * B.length },
  ]
  const bestAi = meanA.indexOf(Math.max(...meanA)), bestBi = meanB.indexOf(Math.max(...meanB))
  const driver = contributions[0].pct >= contributions[1].pct ? contributions[0] : contributions[1]
  const minor = driver === contributions[0] ? contributions[1] : contributions[0]
  const upliftA = Math.round((Math.max(...meanA) - meanA[0]) * 100) / 100
  const decision = `Главный драйвер урожая — «${driver.name}» (${driver.pct}% дисперсии): «${A[bestAi]}» даёт +${upliftA} т/га к контролю. «${minor.name}» почти не влияет (${minor.pct}%) — бюджет логичнее в «${driver.name.toLowerCase()}», а не в смену по «${minor.name.toLowerCase()}».`

  return {
    contributions, grand: Math.round(grand * 100) / 100,
    meansA: A.map((lv, i) => ({ level: lv, mean: Math.round(meanA[i] * 100) / 100 })),
    meansB: B.map((lv, i) => ({ level: lv, mean: Math.round(meanB[i] * 100) / 100 })),
    bestA: A[bestAi], bestB: B[bestBi], decision,
  }
}

function avg(a: number[]) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
function sum(a: number[]) { return a.reduce((s, x) => s + x, 0) }
