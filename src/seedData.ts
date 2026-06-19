// ─────────────────────────────────────────────────────────────
// Genesis OS — данные кабинета семеновода (Надежда Верещак, «Генезис»)
// Все цифры — демо-данные прототипа.
// ─────────────────────────────────────────────────────────────

export type RegStatus = 'в реестре' | 'на регистрации' | 'госиспытание' | 'питомник'
export type DemoStatus = 'посеян' | 'вегетация' | 'убран' | 'в контракт'
export type FieldStatus = 'ok' | 'warn' | 'risk'
export type LeadStage = 'лид' | 'демо' | 'контракт'
export type ContractStatus = 'аванс 60%' | 'сезон' | 'расчёт по факту' | 'закрыт'

export type Hybrid = {
  id: string
  name: string
  maturity: 'ранний' | 'среднеранний' | 'средний'
  drought: number // засухоустойчивость 1..5
  broomrape: number // устойчивость к заразихе 1..5 (раса)
  oil: number // масличность %
  potential: number // потенциал т/га
  zones: string[] // рекомендованные зоны
  reg: RegStatus
  rdStage: string
  clearfield?: boolean
  proven: { zone: string; yield: number; fields: number }[] // «проверено полем»
  note: string
}

export const ZONES = ['Юг (богара)', 'ЦЧО', 'Поволжье', 'Казахстан']

export const HYBRIDS: Hybrid[] = [
  {
    id: 'gelios310', name: 'Гелиос-310', maturity: 'среднеранний', drought: 5, broomrape: 4, oil: 48, potential: 3.5,
    zones: ['Юг (богара)', 'ЦЧО', 'Поволжье'], reg: 'в реестре', rdStage: 'в реестре',
    proven: [{ zone: 'Юг (богара)', yield: 3.0, fields: 64 }, { zone: 'ЦЧО', yield: 3.3, fields: 48 }, { zone: 'Поволжье', yield: 2.8, fields: 30 }],
    note: 'Рабочая лошадь портфеля: держит засуху в бутонизации.',
  },
  {
    id: 'gelios415', name: 'Гелиос-415', maturity: 'средний', drought: 2, broomrape: 3, oil: 50, potential: 3.4,
    zones: ['ЦЧО'], reg: 'в реестре', rdStage: 'в реестре',
    proven: [{ zone: 'Юг (богара)', yield: 2.3, fields: 41 }, { zone: 'ЦЧО', yield: 3.1, fields: 35 }],
    note: 'Высокая масличность при влаге; на Юге чувствителен к июльской жаре.',
  },
  {
    id: 'merkury2', name: 'Меркурий-2', maturity: 'среднеранний', drought: 2, broomrape: 2, oil: 46, potential: 3.0,
    zones: ['ЦЧО'], reg: 'на регистрации', rdStage: 'госиспытание 2-й год',
    proven: [{ zone: 'Юг (богара)', yield: 2.0, fields: 33 }, { zone: 'ЦЧО', yield: 2.9, fields: 25 }],
    note: 'Слабая засухоустойчивость — не для богары Юга.',
  },
  {
    id: 'orionS', name: 'Орион-С', maturity: 'ранний', drought: 5, broomrape: 5, oil: 47, potential: 3.2,
    zones: ['Юг (богара)', 'Поволжье', 'Казахстан'], reg: 'госиспытание', rdStage: 'госиспытание 1-й год',
    proven: [{ zone: 'Юг (богара)', yield: 3.1, fields: 12 }],
    note: 'Новинка R&D: ранний, заразиха раса G+, для острозасушливых зон. Главная ставка регистрации.',
  },
  {
    id: 'sapfirKL', name: 'Сапфир-КЛ', maturity: 'среднеранний', drought: 4, broomrape: 4, oil: 49, potential: 3.6, clearfield: true,
    zones: ['Юг (богара)', 'ЦЧО'], reg: 'на регистрации', rdStage: 'госиспытание 2-й год',
    proven: [{ zone: 'Юг (богара)', yield: 2.8, fields: 9 }, { zone: 'ЦЧО', yield: 3.4, fields: 14 }],
    note: 'Clearfield (под имидазолиноны) — контроль заразихи и сорняков гербицидом.',
  },
]

export type Demo = {
  id: string; farm: string; zone: string; region: string
  myHybrid: string; rival: string
  sown: string; status: DemoStatus
  ndviMine: number; ndviRival: number
  yieldMine?: number; yieldRival?: number
  areaHa?: number; source?: string
}

export const DEMOS_INIT: Demo[] = [
  { id: 'd1', farm: 'КФХ Сергеев', zone: 'Юг (богара)', region: 'Ростовская обл.', myHybrid: 'Орион-С', rival: 'Pioneer P64LE25', sown: '28.04', status: 'убран', ndviMine: 0.70, ndviRival: 0.58, yieldMine: 3.1, yieldRival: 2.6 },
  { id: 'd2', farm: 'Агрофирма «Заря»', zone: 'Юг (богара)', region: 'Ростовская обл.', myHybrid: 'Гелиос-310', rival: 'НК Брио', sown: '02.05', status: 'вегетация', ndviMine: 0.72, ndviRival: 0.63 },
  { id: 'd3', farm: 'КФХ Дон', zone: 'Юг (богара)', region: 'Ставропольский кр.', myHybrid: 'Орион-С', rival: 'Limagrain LG50', sown: '25.04', status: 'убран', ndviMine: 0.66, ndviRival: 0.49, yieldMine: 2.9, yieldRival: 2.1 },
  { id: 'd4', farm: 'ООО «Колос»', zone: 'ЦЧО', region: 'Воронежская обл.', myHybrid: 'Сапфир-КЛ', rival: 'Syngenta SY Bacardi', sown: '06.05', status: 'посеян', ndviMine: 0.30, ndviRival: 0.30 },
]

export type ClientField = {
  id: string; farm: string; zone: string; region: string; hybrid: string; areaHa: number
  ndvi: number; status: FieldStatus; alert?: string; cx: number; cy: number
}

export const CLIENT_FIELDS_INIT: ClientField[] = [
  { id: 'c1', farm: 'Агрофирма «Заря»', zone: 'Юг (богара)', region: 'Ростовская', hybrid: 'Гелиос-310', areaHa: 620, ndvi: 0.72, status: 'ok', cx: 40, cy: 60 },
  { id: 'c2', farm: 'КФХ Сергеев', zone: 'Юг (богара)', region: 'Ростовская', hybrid: 'Орион-С', areaHa: 240, ndvi: 0.68, status: 'ok', cx: 52, cy: 66 },
  { id: 'c3', farm: 'КФХ Дон', zone: 'Юг (богара)', region: 'Ставропольский', hybrid: 'Орион-С', areaHa: 300, ndvi: 0.41, status: 'risk', alert: 'Засуха: NDVI падает 4-й день, влаги нет', cx: 70, cy: 78 },
  { id: 'c4', farm: 'ООО «Колос»', zone: 'ЦЧО', region: 'Воронежская', hybrid: 'Сапфир-КЛ', areaHa: 460, ndvi: 0.66, status: 'ok', cx: 64, cy: 30 },
  { id: 'c5', farm: 'Агрохолдинг «Степь»', zone: 'Юг (богара)', region: 'Краснодарский', hybrid: 'Гелиос-310', areaHa: 1100, ndvi: 0.58, status: 'warn', alert: 'Очаг заразихи на юго-востоке (~40 га)', cx: 30, cy: 80 },
  { id: 'c6', farm: 'КФХ Поволжье-Агро', zone: 'Поволжье', region: 'Саратовская', hybrid: 'Гелиос-310', areaHa: 540, ndvi: 0.55, status: 'warn', alert: 'Жара 36°, риск стресса', cx: 96, cy: 44 },
  { id: 'c7', farm: 'ООО «Нива»', zone: 'ЦЧО', region: 'Курская', hybrid: 'Гелиос-415', areaHa: 380, ndvi: 0.69, status: 'ok', cx: 54, cy: 22 },
  { id: 'c8', farm: 'КФХ Тихий Дон', zone: 'Юг (богара)', region: 'Ростовская', hybrid: 'Меркурий-2', areaHa: 210, ndvi: 0.37, status: 'risk', alert: 'Низкий NDVI: сорт не для богары Юга', cx: 46, cy: 72 },
]

// центроиды — открытая пашня региона (вдали от воды/городов)
export const REGION_COORDS: Record<string, [number, number]> = {
  'Ростовская': [46.85, 41.30], 'Ставропольский': [45.35, 42.10], 'Краснодарский': [45.80, 40.25],
  'Воронежская': [50.95, 40.30], 'Саратовская': [51.40, 45.20], 'Курская': [51.65, 36.30],
}
export const HYBRID_COLORS: Record<string, string> = {
  'Гелиос-310': '#2e9e57', 'Гелиос-415': '#3f7fd6', 'Меркурий-2': '#e0900a', 'Орион-С': '#fc3f1d', 'Сапфир-КЛ': '#b653b0',
}
// прямоугольный участок-поле на пашне региона. Поле крупное и читаемое
// как «границы участка» на национальном масштабе (стилизация); джиттер
// по seed разводит несколько полей одного региона, чтобы не слипались.
export function fieldRing(region: string, seed: number): [number, number][] {
  const b = REGION_COORDS[region] || [46.85, 41.30]
  const j = (n: number) => Math.sin(seed * 99 + n) * 0.5
  const lat = b[0] + j(1.1) * 0.55, lng = b[1] + j(2.7) * 1.0
  const w = 0.55, h = 0.36 // крупный читаемый прямоугольник участка
  return [[lat, lng], [lat, lng + w], [lat - h, lng + w], [lat - h, lng]]
}

export type Contract = {
  id: string; farm: string; hybrid: string; areaHa: number; pu: number
  pricePerPU: number; prepaidPct: number; status: ContractStatus
  expectedYield: number; actualYield?: number
}

export const CONTRACTS_INIT: Contract[] = [
  { id: 'k1', farm: 'Агрофирма «Заря»', hybrid: 'Гелиос-310', areaHa: 620, pu: 124, pricePerPU: 18900, prepaidPct: 60, status: 'сезон', expectedYield: 3.0 },
  { id: 'k2', farm: 'КФХ Дон', hybrid: 'Орион-С', areaHa: 300, pu: 60, pricePerPU: 21500, prepaidPct: 60, status: 'расчёт по факту', expectedYield: 3.0, actualYield: 2.9 },
  { id: 'k3', farm: 'Агрохолдинг «Степь»', hybrid: 'Гелиос-310', areaHa: 1100, pu: 220, pricePerPU: 18900, prepaidPct: 60, status: 'аванс 60%', expectedYield: 2.9 },
]

export type Lot = { id: string; hybrid: string; batch: string; plot: string; pu: number; verified: boolean; claims: number }
export const LOTS_INIT: Lot[] = [
  { id: 'l1', hybrid: 'Гелиос-310', batch: 'G310-25-117', plot: 'Участок гибридизации №3 (Ростов)', pu: 4200, verified: true, claims: 0 },
  { id: 'l2', hybrid: 'Орион-С', batch: 'ORS-25-004', plot: 'Участок №1 (Ставрополь)', pu: 1100, verified: true, claims: 0 },
  { id: 'l3', hybrid: 'Гелиос-310', batch: 'G310-25-118', plot: 'Участок №3 (Ростов)', pu: 3800, verified: false, claims: 2 },
  { id: 'l4', hybrid: 'Сапфир-КЛ', batch: 'SKL-25-009', plot: 'Участок №2 (Воронеж)', pu: 900, verified: true, claims: 0 },
]

// Экономика сделок: подсолнечник ≈ 1 посевная единица (п.е.) на 5 га → 0.2 п.е./га
export const PU_PER_HA = 0.2
export const PRICE_BY_HYBRID: Record<string, number> = {
  'Гелиос-310': 18900, 'Гелиос-415': 18900, 'Меркурий-2': 16500, 'Орион-С': 21500, 'Сапфир-КЛ': 22800,
}
export function dealValue(hybrid: string, areaHa: number) {
  return Math.round(areaHa * PU_PER_HA) * (PRICE_BY_HYBRID[hybrid] ?? 18000)
}
// Вероятность дойти до контракта по стадии воронки (для взвешенного прогноза)
export const STAGE_PROB: Record<LeadStage, number> = { 'лид': 0.2, 'демо': 0.55, 'контракт': 0.9 }

export type Lead = { id: string; farm: string; zone: string; hybrid: string; areaHa: number; stage: LeadStage; channel: string }
export const LEADS_INIT: Lead[] = [
  { id: 'g1', farm: 'КФХ Восход', zone: 'Юг (богара)', hybrid: 'Орион-С', areaHa: 400, stage: 'лид', channel: 'Telegram «АгроНадежды»' },
  { id: 'g2', farm: 'ООО «Заря Кубани»', zone: 'Юг (богара)', hybrid: 'Гелиос-310', areaHa: 900, stage: 'лид', channel: 'Дилер Башкортостан' },
  { id: 'g3', farm: 'КФХ Сергеев', zone: 'Юг (богара)', hybrid: 'Орион-С', areaHa: 240, stage: 'демо', channel: 'Демопосев' },
  { id: 'g4', farm: 'ООО «Колос»', zone: 'ЦЧО', hybrid: 'Сапфир-КЛ', areaHa: 460, stage: 'демо', channel: 'УрожайАгроИнвест' },
  { id: 'g5', farm: 'Агрофирма «Заря»', zone: 'Юг (богара)', hybrid: 'Гелиос-310', areaHa: 620, stage: 'контракт', channel: 'Прямой' },
  { id: 'g6', farm: 'Агрохолдинг «Степь»', zone: 'Юг (богара)', hybrid: 'Гелиос-310', areaHa: 1100, stage: 'контракт', channel: 'Прямой' },
]

export type SeedTask = { id: string; field: string; farm: string; text: string; status: 'новая' | 'в работе' | 'закрыта'; agronom: string }
export const TASKS_INIT: SeedTask[] = [
  { id: 's1', field: 'КФХ Дон · поле у Дона', farm: 'КФХ Дон', text: 'Засуха на Орион-С: выехать, оценить, рекомендовать влагосбережение', status: 'в работе', agronom: 'Агроном Пётр' },
  { id: 's2', field: 'Агрохолдинг «Степь»', farm: 'Агрохолдинг «Степь»', text: 'Очаг заразихи ~40 га: подтвердить расу, схема защиты', status: 'новая', agronom: '—' },
]

// План производства (размножение на участках гибридизации)
export type ProdRow = { hybrid: string; demandPU: number; planHa: number; capacityHa: number }
export const PROD_INIT: ProdRow[] = [
  { hybrid: 'Гелиос-310', demandPU: 9800, planHa: 780, capacityHa: 800 },
  { hybrid: 'Орион-С', demandPU: 5200, planHa: 470, capacityHa: 300 },
  { hybrid: 'Сапфир-КЛ', demandPU: 2100, planHa: 180, capacityHa: 250 },
  { hybrid: 'Гелиос-415', demandPU: 1600, planHa: 140, capacityHa: 200 },
]

// Урожайность участка размножения, п.е./га (родительские формы дают меньше товарного гибрида)
export const PU_YIELD_PER_HA = 13
// Переходящий остаток готовой продукции с прошлого сезона, п.е.
export const CARRYOVER_PU: Record<string, number> = { 'Гелиос-310': 1800, 'Орион-С': 0, 'Сапфир-КЛ': 300, 'Гелиос-415': 600 }

// Участки гибридизации (размножение F1) — путь от родительских форм до готовой партии
export type PlotStatus = 'сев' | 'вегетация' | 'кастрация' | 'уборка' | 'доработка'
export type GenPlot = {
  id: string; name: string; region: string; hybrid: string; parentLines: string
  areaHa: number; progressPct: number; status: PlotStatus
}
export const PLOTS: GenPlot[] = [
  { id: 'p1', name: 'Участок гибридизации №3', region: 'Ростовская', hybrid: 'Гелиос-310', parentLines: 'ВА-310 (♀, ЦМС) × ВБ-77 (♂)', areaHa: 420, progressPct: 100, status: 'доработка' },
  { id: 'p2', name: 'Участок №3-бис', region: 'Ростовская', hybrid: 'Гелиос-310', parentLines: 'ВА-310 (♀, ЦМС) × ВБ-77 (♂)', areaHa: 380, progressPct: 70, status: 'уборка' },
  { id: 'p3', name: 'Участок №1', region: 'Ставропольский', hybrid: 'Орион-С', parentLines: 'ОР-5 (♀, ЦМС) × Rf-21 (♂)', areaHa: 300, progressPct: 55, status: 'кастрация' },
  { id: 'p4', name: 'Участок №2', region: 'Воронежская', hybrid: 'Сапфир-КЛ', parentLines: 'СФ-9 (♀, ЦМС, КЛ) × Rf-КЛ (♂)', areaHa: 180, progressPct: 40, status: 'вегетация' },
  { id: 'p5', name: 'Участок №4', region: 'Воронежская', hybrid: 'Гелиос-415', parentLines: 'ВА-415 (♀, ЦМС) × ВБ-77 (♂)', areaHa: 140, progressPct: 20, status: 'сев' },
]

export const AGRONOMS = ['Агроном Пётр', 'Агроном Сергей', 'Надежда (лично)']
export const RIVALS = ['Pioneer P64LE25', 'НК Брио', 'Limagrain LG50', 'Syngenta SY Bacardi', 'RUSEED Светлана']

// Zone-fit рекомендатель: ранжируем гибриды под зону
export function recommendForZone(hybrids: Hybrid[], zone: string, maturity?: string) {
  return hybrids
    .map((h) => {
      const proven = h.proven.find((p) => p.zone === zone)
      const fits = h.zones.includes(zone)
      // балл: засухоустойчивость важнее всего на богаре Юга
      const droughtW = zone.startsWith('Юг') ? 2 : 1
      let score = h.drought * droughtW + h.broomrape + (proven ? proven.yield * 2 : 0) + (fits ? 3 : 0)
      if (maturity && h.maturity === maturity) score += 2
      const warn = !fits
        ? `Не рекомендован для «${zone}» — риск как у Гелиос-415 на Юге`
        : h.drought <= 2 && zone.startsWith('Юг')
          ? 'Низкая засухоустойчивость для богары Юга'
          : undefined
      return { h, proven, score, warn }
    })
    .sort((a, b) => b.score - a.score)
}
