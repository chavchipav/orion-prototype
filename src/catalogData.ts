import { mulberry32, hash } from './utils'
// ─────────────────────────────────────────────────────────────
// Каталог семян (реальные рыночные гибриды) + статистика полевых испытаний по регионам.
// Кукуруза — ДКС (DEKALB, значения со скриншотов Bayer-селектора). Подсолнечник — реальные
// рыночные гибриды (ЕС Генезис, Щёлково, ВНИИМК, Агроплазма). Цифры испытаний — демо-правдоподобные.
// ─────────────────────────────────────────────────────────────

export type Crop = 'Подсолнечник' | 'Кукуруза'
export type HerbTech = 'Классика' | 'Clearfield' | 'Express'
export type Density = 'Фикс' | 'Флекс' | 'Ближе к Фикс' | 'Ближе к Флекс'

export type CatalogHybrid = {
  id: string; name: string; brand: string; crop: Crop
  purpose: string[]          // подсолн: Масличный/Кондитерский · кукуруза: Зерно/Силос/Универсальный
  maturity: string           // группа спелости (текст)
  vegDays?: number           // дни вегетации (подсолнечник)
  fao?: number               // ФАО (кукуруза)
  drought: number            // засухоустойчивость 1–9
  cold?: number              // холодостойкость 1–9 (кукуруза)
  moisture?: number          // влагоотдача 1–9 (кукуруза)
  remont?: number            // ремонтантность 1–9 (кукуруза)
  herbTech?: HerbTech        // гербицидная система (подсолнечник)
  broomrape?: string         // устойчивость к заразихе, расы (подсолнечник)
  oil?: number               // масличность % (подсолнечник)
  diseases?: { lmr: number; phomopsis: number; sclerotinia: number } // 1–9 (подсолнечник)
  density: Density
  yieldPotential: number     // потенциал, ц/га
  zones: string[]            // регионы рекомендации/испытаний
  video?: boolean
  desc: string
}

export const REGIONS = [
  'Краснодарский край', 'Ростовская обл.', 'Ставропольский край',
  'Воронежская обл.', 'Саратовская обл.', 'Белгородская обл.', 'Волгоградская обл.',
]

const Z = {
  yug: ['Краснодарский край', 'Ростовская обл.', 'Ставропольский край'],
  cco: ['Воронежская обл.', 'Белгородская обл.'],
  povolzhye: ['Саратовская обл.', 'Волгоградская обл.'],
}

// ── Кукуруза (DEKALB / ДКС — значения со скриншотов селектора) ──
const CORN: CatalogHybrid[] = [
  { id: 'dks3203', name: 'ДКС 3203', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно', 'Силос'], maturity: 'раннеспелый', fao: 190, drought: 6, cold: 9, moisture: 8, remont: 5, density: 'Флекс', yieldPotential: 92, zones: [...Z.cco, ...Z.povolzhye], desc: 'Простой раннеспелый гибрид для холодных регионов и поздних сроков сева.' },
  { id: 'dks3361', name: 'ДКС 3361', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно', 'Силос'], maturity: 'среднеранний', fao: 240, drought: 8, cold: 8, moisture: 9, remont: 4, density: 'Флекс', yieldPotential: 102, zones: [...Z.yug, ...Z.cco], video: true, desc: 'Простой среднеранний гибрид универсального направления.' },
  { id: 'dks3730', name: 'ДКС 3730', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно', 'Силос'], maturity: 'среднеспелый', fao: 280, drought: 7, cold: 7, moisture: 7, remont: 7, density: 'Ближе к Флекс', yieldPotential: 108, zones: [...Z.yug, ...Z.cco], desc: 'Простой среднеспелый гибрид универсального направления.' },
  { id: 'dks3789', name: 'ДКС 3789', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно'], maturity: 'среднеспелый', fao: 280, drought: 8, cold: 8, moisture: 9, remont: 6, density: 'Ближе к Фикс', yieldPotential: 110, zones: [...Z.yug, ...Z.cco], video: true, desc: 'Простой среднеспелый гибрид зернового направления.' },
  { id: 'dks4014', name: 'ДКС 4014', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно', 'Силос'], maturity: 'среднеспелый', fao: 340, drought: 8, cold: 6, moisture: 8, remont: 6, density: 'Флекс', yieldPotential: 115, zones: Z.yug, desc: 'Простой среднеспелый гибрид универсального направления.' },
  { id: 'dks5075', name: 'ДКС 5075', brand: 'DEKALB', crop: 'Кукуруза', purpose: ['Зерно', 'Силос'], maturity: 'среднепоздний', fao: 400, drought: 9, cold: 8, moisture: 8, remont: 8, density: 'Флекс', yieldPotential: 125, zones: Z.yug, video: true, desc: 'Простой среднепоздний гибрид универсального направления для орошения и высокоинтенсивной технологии.' },
]

// ── Подсолнечник (реальные рыночные гибриды) ──
const SUN: CatalogHybrid[] = [
  { id: 'esgenesis', name: 'ЕС Генезис', brand: 'Bayer', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'раннеспелый', vegDays: 100, herbTech: 'Классика', broomrape: 'A–G', oil: 50, drought: 8, diseases: { lmr: 8, phomopsis: 7, sclerotinia: 6 }, density: 'Флекс', yieldPotential: 50, zones: [...Z.yug, ...Z.cco], video: true, desc: 'Раннеспелый засухоустойчивый гибрид, устойчив к заразихе и ложной мучнистой росе.' },
  { id: 'iskander', name: 'Искандер', brand: 'Щёлково Агрохим', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеранний', vegDays: 105, herbTech: 'Clearfield', broomrape: 'A–E', oil: 52, drought: 8, diseases: { lmr: 8, phomopsis: 7, sclerotinia: 8 }, density: 'Флекс', yieldPotential: 50, zones: [...Z.yug, ...Z.povolzhye], video: true, desc: 'Clearfield-гибрид: контроль заразихи и сорняков имидазолинонами, высокая масличность.' },
  { id: 'solncepek', name: 'Солнцепёк', brand: 'Щёлково Агрохим', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеспелый', vegDays: 112, herbTech: 'Express', broomrape: 'A–G', oil: 50, drought: 7, diseases: { lmr: 7, phomopsis: 7, sclerotinia: 7 }, density: 'Флекс', yieldPotential: 48, zones: [...Z.yug, ...Z.cco], desc: 'Express-гибрид под трибенурон-метил, стабильный по годам.' },
  { id: 'arev', name: 'Арэв', brand: 'ВНИИМК / Август', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеранний', vegDays: 106, herbTech: 'Классика', broomrape: 'A–G', oil: 51, drought: 8, diseases: { lmr: 8, phomopsis: 7, sclerotinia: 7 }, density: 'Флекс', yieldPotential: 47, zones: Z.yug, desc: 'Среднеранний высокомасличный гибрид с широкой устойчивостью к заразихе.' },
  { id: 'iren', name: 'Ирэн', brand: 'ФНЦ ВНИИМК', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеранний', vegDays: 104, herbTech: 'Классика', broomrape: 'A–G', oil: 50, drought: 6, diseases: { lmr: 7, phomopsis: 6, sclerotinia: 7 }, density: 'Ближе к Флекс', yieldPotential: 43, zones: [...Z.cco, ...Z.povolzhye], desc: 'Классический гибрид со стабильной общей устойчивостью к болезням.' },
  { id: 'svetlana', name: 'Светлана', brand: 'Агроплазма', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'раннеспелый', vegDays: 98, herbTech: 'Классика', broomrape: 'A–G', oil: 52, drought: 7, diseases: { lmr: 8, phomopsis: 7, sclerotinia: 8 }, density: 'Флекс', yieldPotential: 45, zones: [...Z.cco, ...Z.povolzhye], desc: 'Раннеспелый высокомасличный гибрид с высокой болезнеустойчивостью.' },
  { id: 'norma', name: 'Норма', brand: 'Агроплазма', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеранний', vegDays: 107, herbTech: 'Clearfield', broomrape: 'A–F', oil: 50, drought: 6, diseases: { lmr: 7, phomopsis: 6, sclerotinia: 6 }, density: 'Ближе к Фикс', yieldPotential: 46, zones: [...Z.yug, ...Z.povolzhye], desc: 'Clearfield-гибрид со средней засухоустойчивостью, для интенсивной технологии.' },
  { id: 'lord', name: 'Лорд', brand: 'Агроплазма', crop: 'Подсолнечник', purpose: ['Масличный'], maturity: 'среднеранний', vegDays: 108, herbTech: 'Express', broomrape: 'A–F', oil: 51, drought: 7, diseases: { lmr: 7, phomopsis: 7, sclerotinia: 7 }, density: 'Флекс', yieldPotential: 47, zones: [...Z.yug, ...Z.cco], desc: 'Express-гибрид, толерантен к комплексу болезней.' },
  { id: 'lakomka', name: 'Лакомка', brand: 'Агроплазма', crop: 'Подсолнечник', purpose: ['Кондитерский'], maturity: 'среднеспелый', vegDays: 110, herbTech: 'Классика', broomrape: 'A–E', oil: 44, drought: 6, diseases: { lmr: 6, phomopsis: 6, sclerotinia: 7 }, density: 'Флекс', yieldPotential: 35, zones: [...Z.yug, ...Z.cco], desc: 'Кондитерский крупноплодный гибрид (фракция, калибр), пониженная масличность.' },
]

export const CATALOG: CatalogHybrid[] = [...SUN, ...CORN]
export const hybridById = (id: string) => CATALOG.find((h) => h.id === id)

// ── Полевые испытания по регионам (генерируются детерминированно) ──
export type Trial = {
  hybridId: string; region: string; year: number
  plotsHa: number; fields: number; yield: number
  competitor: string; competitorYield: number
  rainfall: number; activeTemp: number; soil: string; note: string
}


const CLIMATE: Record<string, { rain: number; temp: number; soil: string; favor: number }> = {
  'Краснодарский край': { rain: 480, temp: 3400, soil: 'Чернозём кубанский', favor: 1.0 },
  'Ростовская обл.': { rain: 300, temp: 3050, soil: 'Чернозём южный', favor: 0.82 },
  'Ставропольский край': { rain: 330, temp: 3150, soil: 'Чернозём обыкновенный', favor: 0.85 },
  'Воронежская обл.': { rain: 400, temp: 3000, soil: 'Чернозём выщелоченный', favor: 0.92 },
  'Саратовская обл.': { rain: 280, temp: 2900, soil: 'Тёмно-каштановая', favor: 0.75 },
  'Белгородская обл.': { rain: 430, temp: 2950, soil: 'Чернозём типичный', favor: 0.9 },
  'Волгоградская обл.': { rain: 290, temp: 3100, soil: 'Каштановая', favor: 0.72 },
}
const YEAR_FACTOR: Record<number, number> = { 2024: 0.95, 2025: 0.8 } // 2025 — засушливый
const COMPETITORS = ['НК Брио', 'Pioneer P64LE25', 'Сингента СИ Бакарди', 'контроль (стандарт)']

function genTrials(): Trial[] {
  const out: Trial[] = []
  for (const h of CATALOG) {
    for (const region of h.zones) {
      const cl = CLIMATE[region]
      for (const year of [2024, 2025]) {
        const rnd = mulberry32(hash(h.id + region + year))
        const yf = YEAR_FACTOR[year]
        const stress = cl.favor < 0.85 || year === 2025
        const droughtAdj = stress ? (h.drought - 6) * 1.6 : (h.drought - 7) * 0.5
        const base = h.yieldPotential * cl.favor * yf + droughtAdj
        const yieldV = Math.round((base + (rnd() - 0.5) * 4) * 10) / 10
        // в стрессе засухоустойчивые сильнее обгоняют контроль
        const edge = (stress ? 3 : 1) + (h.drought - 6) * 0.7 + rnd() * 2
        out.push({
          hybridId: h.id, region, year,
          plotsHa: Math.round((1.8 + rnd() * 0.9) * 10) / 10,
          fields: 6 + Math.floor(rnd() * 22),
          yield: yieldV,
          competitor: COMPETITORS[Math.floor(rnd() * COMPETITORS.length)],
          competitorYield: Math.round((yieldV - edge) * 10) / 10,
          rainfall: cl.rain + Math.floor((rnd() - 0.5) * 60),
          activeTemp: cl.temp + Math.floor((rnd() - 0.5) * 200),
          soil: cl.soil,
          note: stress ? 'засушливый сезон' : 'благоприятные условия',
        })
      }
    }
  }
  return out
}
export const TRIALS: Trial[] = genTrials()

export const trialsFor = (hybridId: string) => TRIALS.filter((t) => t.hybridId === hybridId)
export const trialRegions = (hybridId: string) => [...new Set(trialsFor(hybridId).map((t) => t.region))]
// средняя урожайность по региону (для строки результата)
export function trialAvg(hybridId: string, region: string) {
  const rows = TRIALS.filter((t) => t.hybridId === hybridId && t.region === region)
  if (!rows.length) return null
  const yieldAvg = rows.reduce((s, t) => s + t.yield, 0) / rows.length
  const fields = rows.reduce((s, t) => s + t.fields, 0)
  const edge = rows.reduce((s, t) => s + (t.yield - t.competitorYield), 0) / rows.length
  return { yield: Math.round(yieldAvg * 10) / 10, fields, edge: Math.round(edge * 10) / 10 }
}

// шкала 1–9 → подпись
export function scaleLabel(n: number) {
  return n <= 3 ? 'низкая' : n <= 6 ? 'средняя' : n <= 8 ? 'высокая' : 'очень высокая'
}
// гибриды культуры, у которых есть испытания в регионе (доступность по факту проверки)
export function hybridsForRegion(crop: Crop, region: string) {
  return CATALOG.filter((h) => h.crop === crop && trialRegions(h.id).includes(region))
}
