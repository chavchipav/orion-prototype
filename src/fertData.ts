// ─────────────────────────────────────────────────────────────
// Удобрения и добавки: справочник (NPK) + лог внесения по полям (из техкарт/работ).
// Демо-данные прототипа.
// ─────────────────────────────────────────────────────────────
import { AG_FIELDS } from './agronomData'
import { mulberry32, hash } from './utils'

export type Fert = { id: string; name: string; kind: 'Азотное' | 'Сложное' | 'Калийное' | 'Микро'; n: number; p: number; k: number; price: number } // n/p/k — % д.в., price ₽/т
export const FERTS: Fert[] = [
  { id: 'urea', name: 'Карбамид', kind: 'Азотное', n: 46, p: 0, k: 0, price: 34000 },
  { id: 'an', name: 'Аммиачная селитра', kind: 'Азотное', n: 34.4, p: 0, k: 0, price: 23000 },
  { id: 'uan', name: 'КАС-32', kind: 'Азотное', n: 32, p: 0, k: 0, price: 25000 },
  { id: 'map', name: 'Аммофос', kind: 'Сложное', n: 12, p: 52, k: 0, price: 56000 },
  { id: 'sas', name: 'Сульфоаммофос', kind: 'Сложное', n: 20, p: 20, k: 0, price: 38000 },
  { id: 'npk', name: 'Нитроаммофоска', kind: 'Сложное', n: 16, p: 16, k: 16, price: 42000 },
  { id: 'dap', name: 'Диаммофоска', kind: 'Сложное', n: 10, p: 26, k: 26, price: 50000 },
  { id: 'kcl', name: 'Калий хлористый', kind: 'Калийное', n: 0, p: 0, k: 60, price: 38000 },
  { id: 'micro', name: 'Микро (B, Zn)', kind: 'Микро', n: 0, p: 0, k: 0, price: 180000 },
]
export const fertById = (id: string) => FERTS.find((f) => f.id === id)!

export type FertApp = { id: string; fieldId: string; field: string; crop: string; areaHa: number; fertId: string; phase: string; date: string; normKgHa: number }


const BASE_FERTS = ['map', 'sas', 'npk', 'dap']  // припосевное (P)
const TOP_FERTS = ['urea', 'an', 'uan']          // подкормка (N)

function genLog(): FertApp[] {
  const out: FertApp[] = []
  let n = 0
  for (const f of AG_FIELDS) {
    if (f.crop === 'Пар') continue
    const rnd = mulberry32(hash(f.id + 'fert'))
    // основное внесение (сев)
    const baseF = BASE_FERTS[Math.floor(rnd() * BASE_FERTS.length)]
    out.push({ id: 'fa' + ++n, fieldId: f.id, field: f.name, crop: f.crop, areaHa: f.areaHa, fertId: baseF, phase: 'Основное (под сев)', date: f.crop === 'Озимая пшеница' ? '02.10' : '24.04', normKgHa: 80 + Math.floor(rnd() * 70) })
    // подкормка (вегетация) — не у всех
    if (rnd() < 0.8) {
      const topF = TOP_FERTS[Math.floor(rnd() * TOP_FERTS.length)]
      out.push({ id: 'fa' + ++n, fieldId: f.id, field: f.name, crop: f.crop, areaHa: f.areaHa, fertId: topF, phase: 'Подкормка', date: f.crop === 'Озимая пшеница' ? '22.03' : '20.05', normKgHa: 100 + Math.floor(rnd() * 100) })
    }
    // микро — изредка
    if (rnd() < 0.3) out.push({ id: 'fa' + ++n, fieldId: f.id, field: f.name, crop: f.crop, areaHa: f.areaHa, fertId: 'micro', phase: 'Листовая подкормка', date: '05.06', normKgHa: 1 + Math.floor(rnd() * 2) })
  }
  return out
}
export const FERT_LOG: FertApp[] = genLog()

// производные метрики записи внесения
export function appMetrics(a: FertApp) {
  const f = fertById(a.fertId)
  const physT = (a.normKgHa * a.areaHa) / 1000 // т физ. веса
  const nT = physT * f.n / 100, pT = physT * f.p / 100, kT = physT * f.k / 100
  const cost = physT * f.price
  return { physT, nT, pT, kT, cost, name: f.name, kind: f.kind }
}
