// ─────────────────────────────────────────────────────────────
// Каталог СЗР (реальные рыночные продукты) + полевые опыты «продукт vs контроль».
// Эталон — academy.cs.bayer.ru: Подбор СЗР + Результаты полевых опытов. Цифры — демо-правдоподобные.
// ─────────────────────────────────────────────────────────────
import { REGIONS } from './catalogData'
import { mulberry32, hash } from './utils'

export type SzrType = 'Гербицид' | 'Фунгицид' | 'Инсектицид'
export const SZR_CROPS = ['Кукуруза', 'Подсолнечник', 'Озимая пшеница']

// маркерные проблемы по типу защиты (для шага подбора)
export const SZR_MARKERS: Record<SzrType, string[]> = {
  'Гербицид': ['Однолетние злаковые', 'Многолетние злаковые (гумай, пырей)', 'Двудольные сорняки', 'Устойчивая щирица', 'Амброзия', 'Падалица подсолнечника'],
  'Фунгицид': ['Септориоз', 'Бурая ржавчина', 'Фузариоз колоса', 'Мучнистая роса', 'ЛМР (пероноспороз)', 'Склеротиния'],
  'Инсектицид': ['Луговой мотылёк', 'Клоп вредная черепашка', 'Тля', 'Хлопковая совка', 'Подсолнечниковая огнёвка'],
}
// фазы по культуре
export const SZR_PHASES: Record<string, string[]> = {
  'Кукуруза': ['Всходы – 3 листа', '3–6 листьев', '6–8 листьев'],
  'Подсолнечник': ['2–4 листа', 'Бутонизация', 'Цветение'],
  'Озимая пшеница': ['Кущение', 'Выход в трубку', 'Колошение'],
}

export type SzrProduct = {
  id: string; name: string; brand: string; type: SzrType; ai: string
  crops: string[]; target: string[]; schema: 'Однократная' | 'Двукратная' | 'Гибкая'; phases: string[]
  norm: number; unit: string; hazard: number; waitDays: number; desc: string; video?: boolean
}

export const SZR_CATALOG: SzrProduct[] = [
  // ── гербициды ──
  { id: 'maister', name: 'Майстер Пауэр', brand: 'Bayer', type: 'Гербицид', ai: 'форамсульфурон + йодосульфурон + тиенкарбазон', crops: ['Кукуруза'], target: ['Однолетние злаковые', 'Многолетние злаковые (гумай, пырей)', 'Двудольные сорняки'], schema: 'Однократная', phases: ['3–6 листьев'], norm: 1.5, unit: 'л/га', hazard: 3, waitDays: 60, desc: 'Универсальный послевсходовый гербицид для контроля полного спектра сорняков в посевах кукурузы.', video: true },
  { id: 'velocity', name: 'Велосити Супер', brand: 'Bayer', type: 'Гербицид', ai: 'тиенкарбазон + йодосульфурон + мефенпир', crops: ['Озимая пшеница'], target: ['Двудольные сорняки', 'Однолетние злаковые'], schema: 'Однократная', phases: ['Кущение'], norm: 1.0, unit: 'л/га', hazard: 3, waitDays: 60, desc: 'Послевсходовый гербицид широкого спектра для зерновых.' },
  { id: 'esteron', name: 'Эстерон', brand: 'Corteva', type: 'Гербицид', ai: '2-этилгексиловый эфир 2,4-Д', crops: ['Кукуруза', 'Озимая пшеница'], target: ['Двудольные сорняки', 'Амброзия'], schema: 'Однократная', phases: ['3–6 листьев', 'Кущение'], norm: 0.8, unit: 'л/га', hazard: 3, waitDays: 45, desc: 'Гормональный гербицид против двудольных, в т.ч. переросших.' },
  // ── фунгициды ──
  { id: 'skyway', name: 'Скайвэй', brand: 'Bayer', type: 'Фунгицид', ai: 'протиоконазол + спироксамин + тебуконазол', crops: ['Озимая пшеница'], target: ['Септориоз', 'Бурая ржавчина', 'Фузариоз колоса'], schema: 'Двукратная', phases: ['Выход в трубку', 'Колошение'], norm: 1.0, unit: 'л/га', hazard: 3, waitDays: 40, desc: 'Трёхкомпонентный фунгицид для защиты колоса и флагового листа.', video: true },
  { id: 'prosaro', name: 'Прозаро', brand: 'Bayer', type: 'Фунгицид', ai: 'протиоконазол + тебуконазол', crops: ['Озимая пшеница', 'Подсолнечник'], target: ['Фузариоз колоса', 'ЛМР (пероноспороз)', 'Склеротиния'], schema: 'Однократная', phases: ['Колошение', 'Бутонизация'], norm: 0.8, unit: 'л/га', hazard: 3, waitDays: 40, desc: 'Системный фунгицид против комплекса болезней зерновых и подсолнечника.', video: true },
  { id: 'input', name: 'Инпут', brand: 'Bayer', type: 'Фунгицид', ai: 'протиоконазол + спироксамин', crops: ['Озимая пшеница'], target: ['Септориоз', 'Мучнистая роса', 'Бурая ржавчина'], schema: 'Однократная', phases: ['Выход в трубку'], norm: 0.6, unit: 'л/га', hazard: 3, waitDays: 40, desc: 'Фунгицид для ранней защиты листового аппарата.' },
  // ── инсектициды ──
  { id: 'decis', name: 'Децис Эксперт', brand: 'Bayer', type: 'Инсектицид', ai: 'дельтаметрин', crops: ['Кукуруза', 'Озимая пшеница', 'Подсолнечник'], target: ['Луговой мотылёк', 'Клоп вредная черепашка', 'Тля'], schema: 'Гибкая', phases: ['3–6 листьев', 'Колошение', 'Бутонизация'], norm: 0.125, unit: 'л/га', hazard: 2, waitDays: 30, desc: 'Контактно-кишечный инсектицид быстрого действия.', video: true },
  { id: 'confidor', name: 'Конфидор Экстра', brand: 'Bayer', type: 'Инсектицид', ai: 'имидаклоприд', crops: ['Подсолнечник', 'Озимая пшеница'], target: ['Тля', 'Хлопковая совка'], schema: 'Однократная', phases: ['Бутонизация', 'Колошение'], norm: 0.1, unit: 'кг/га', hazard: 3, waitDays: 30, desc: 'Системный инсектицид против сосущих вредителей.' },
]
export const szrById = (id: string) => SZR_CATALOG.find((p) => p.id === id)

// ── полевые опыты: продукт vs контроль (прибавка ц/га) ──
export type SzrTrial = {
  productId: string; region: string; year: number; crop: string
  plotsHa: number; fields: number; treated: number; control: number; gain: number
  vs: string; rainfall: number; soil: string; note: string
}


const CROP_BASE: Record<string, number> = { 'Кукуруза': 108, 'Подсолнечник': 35, 'Озимая пшеница': 54 }
const GAIN_BY_PRODUCT: Record<string, number> = { maister: 8, velocity: 5, esteron: 4, skyway: 7, prosaro: 6, input: 5, decis: 4, confidor: 3 }
const REGION_FAVOR: Record<string, { f: number; rain: number; soil: string }> = {
  'Краснодарский край': { f: 1.0, rain: 480, soil: 'Чернозём кубанский' }, 'Ростовская обл.': { f: 0.84, rain: 300, soil: 'Чернозём южный' },
  'Ставропольский край': { f: 0.86, rain: 330, soil: 'Чернозём обыкновенный' }, 'Воронежская обл.': { f: 0.92, rain: 400, soil: 'Чернозём выщелоченный' },
  'Саратовская обл.': { f: 0.76, rain: 280, soil: 'Тёмно-каштановая' }, 'Белгородская обл.': { f: 0.9, rain: 430, soil: 'Чернозём типичный' }, 'Волгоградская обл.': { f: 0.74, rain: 290, soil: 'Каштановая' },
}
const CONTROLS: Record<SzrType, string> = { 'Гербицид': 'без гербицида (засорённый)', 'Фунгицид': 'без фунгицида (стандарт)', 'Инсектицид': 'без инсектицида (стандарт)' }

function genSzrTrials(): SzrTrial[] {
  const out: SzrTrial[] = []
  const regs = REGIONS.slice(0, 4)
  for (const p of SZR_CATALOG) {
    for (const crop of p.crops) {
      const base = CROP_BASE[crop]
      const regions = regs.slice(0, 2 + (hash(p.id + crop) % 2)) // 2–3 региона
      for (const region of regions) {
        const cl = REGION_FAVOR[region]
        for (const year of [2024, 2025]) {
          const rnd = mulberry32(hash(p.id + crop + region + year))
          const stress = year === 2025 || cl.f < 0.82
          const treated = Math.round(base * cl.f * (year === 2025 ? 0.86 : 0.98) * 10) / 10
          const gain = Math.round((GAIN_BY_PRODUCT[p.id] * (stress ? 1.15 : 1) + (rnd() - 0.5) * 2) * 10) / 10
          out.push({
            productId: p.id, region, year, crop,
            plotsHa: Math.round((1.8 + rnd() * 0.9) * 10) / 10, fields: 6 + Math.floor(rnd() * 16),
            treated, control: Math.round((treated - gain) * 10) / 10, gain, vs: CONTROLS[p.type],
            rainfall: cl.rain + Math.floor((rnd() - 0.5) * 50), soil: cl.soil, note: stress ? 'засушливый/инфекционный фон' : 'благоприятные условия',
          })
        }
      }
    }
  }
  return out
}
export const SZR_TRIALS: SzrTrial[] = genSzrTrials()
export const szrTrialsFor = (productId: string) => SZR_TRIALS.filter((t) => t.productId === productId)
export function szrTrialAvg(productId: string, crop?: string) {
  const rows = SZR_TRIALS.filter((t) => t.productId === productId && (!crop || t.crop === crop))
  if (!rows.length) return null
  return { gain: Math.round((rows.reduce((s, t) => s + t.gain, 0) / rows.length) * 10) / 10, fields: rows.reduce((s, t) => s + t.fields, 0) }
}
