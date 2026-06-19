// ─────────────────────────────────────────────────────────────
// Склад: справочник расходников + начальные остатки + связь с работами.
// Расход СЗР/топлива списывается АВТОМАТИЧЕСКИ из «Работ» (agroStore):
//   приход = закупки (inventoryStore), расход = norm × га по работам + ГСМ.
// ─────────────────────────────────────────────────────────────

export type ResType = 'Семена' | 'СЗР' | 'Удобрения' | 'Топливо' | 'Оплата' | 'Прочее'

export const RES_TYPES: ResType[] = ['Семена', 'СЗР', 'Удобрения', 'Топливо', 'Оплата', 'Прочее']

export type StockItem = {
  id: string
  name: string
  type: ResType
  unit: string      // л · кг · т · п.е.
  opening: number   // остаток на начало сезона
  price: number     // ₽ за единицу
  min: number       // мин. остаток (порог алерта)
}

// Начальные остатки склада фермы (демо-правдоподобные).
export const STOCK_ITEMS: StockItem[] = [
  // ── СЗР ──
  { id: 'szr_prozaro', name: 'Прозаро', type: 'СЗР', unit: 'л', opening: 320, price: 3450, min: 80 },
  { id: 'szr_decis', name: 'Децис Эксперт', type: 'СЗР', unit: 'л', opening: 56, price: 5200, min: 25 },
  { id: 'szr_input', name: 'Инпут', type: 'СЗР', unit: 'л', opening: 360, price: 2900, min: 60 },
  { id: 'szr_glifosat', name: 'Глифосат', type: 'СЗР', unit: 'л', opening: 880, price: 480, min: 250 },
  // ── Удобрения ──
  { id: 'fert_karbamid', name: 'Карбамид', type: 'Удобрения', unit: 'т', opening: 48, price: 34000, min: 15 },
  { id: 'fert_ammofos', name: 'Аммофос', type: 'Удобрения', unit: 'т', opening: 22, price: 52000, min: 10 },
  // ── Топливо ──
  { id: 'fuel_dt', name: 'Дизельное топливо', type: 'Топливо', unit: 'л', opening: 21000, price: 62, min: 6000 },
  // ── Семена ──
  { id: 'seed_g310', name: 'Семена подсолнечника «Гелиос-310»', type: 'Семена', unit: 'п.е.', opening: 64, price: 18900, min: 20 },
]

export function stockItemById(id: string): StockItem | undefined {
  return STOCK_ITEMS.find((s) => s.id === id)
}

// Расход дизеля на единицу полевой работы (га) — для авто-списания ГСМ.
export const FUEL_L_PER_HA = 7.5
export const FUEL_STOCK_ID = 'fuel_dt'

// Парсинг строки продукта из рекомендации: «Прозаро 0,8 л/га» → { name, norm, unit }.
export function parseProduct(s: string): { name: string; norm: number; unit: string } | null {
  const m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(л|кг|т)\s*\/\s*га/i)
  if (!m) return null
  return { name: m[1].trim(), norm: parseFloat(m[2].replace(',', '.')), unit: m[3].toLowerCase() }
}

// Сопоставление имени продукта со складской позицией (по префиксу названия).
export function stockIdForProduct(name: string): string | null {
  const n = name.toLowerCase()
  const hit = STOCK_ITEMS.find((it) => n.startsWith(it.name.toLowerCase()) || it.name.toLowerCase().startsWith(n))
  return hit ? hit.id : null
}

export function rub(n: number): string {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽'
}

// ── Авто-расход из работ (agroStore) ────────────────────────────
// Каждая работа жжёт ГСМ (га × FUEL_L_PER_HA); обработка дополнительно
// списывает СЗР (норма × га). Реактивно: отметка «Факт» меняет склад.
import type { Issue } from './agroStore'

export type Movement = {
  id: string
  stockId: string | null
  name: string
  type: ResType
  unit: string
  dir: 'in' | 'out'
  qty: number
  sum: number       // ₽
  date: string
  work?: string     // операция
  field?: string
  viaMarket?: boolean
}

export function consumptionMovements(issues: Issue[]): Movement[] {
  const out: Movement[] = []
  issues.filter((i) => i.work).forEach((i) => {
    const w = i.work!
    // ГСМ на каждую полевую работу
    const fuel = stockItemById(FUEL_STOCK_ID)!
    const fuelQty = Math.round(w.ha * FUEL_L_PER_HA)
    out.push({ id: `fuel-${i.id}`, stockId: fuel.id, name: fuel.name, type: 'Топливо', unit: fuel.unit, dir: 'out', qty: fuelQty, sum: fuelQty * fuel.price, date: w.date, work: w.op, field: i.fieldName })
    // СЗР по норме (если продукт распознан и есть на складе)
    const p = parseProduct(i.rec.product)
    const sid = p ? stockIdForProduct(p.name) : null
    const it = sid ? stockItemById(sid) : undefined
    if (p && it) {
      const qty = +(p.norm * w.ha).toFixed(1)
      out.push({ id: `szr-${i.id}`, stockId: it.id, name: it.name, type: it.type, unit: it.unit, dir: 'out', qty, sum: qty * it.price, date: w.date, work: w.op, field: i.fieldName })
    }
  })
  return out
}

// Сводка по позициям: остаток = opening + приход − расход.
export type StockRow = StockItem & { inQty: number; outQty: number; balance: number; balanceSum: number; inSum: number; outSum: number; low: boolean }

export function buildStockRows(inFor: (id: string) => number, consumption: Movement[]): StockRow[] {
  return STOCK_ITEMS.map((it) => {
    const inQty = inFor(it.id)
    const outs = consumption.filter((m) => m.stockId === it.id)
    const outQty = outs.reduce((s, m) => s + m.qty, 0)
    const balance = it.opening + inQty - outQty
    return {
      ...it,
      inQty,
      outQty: +outQty.toFixed(1),
      inSum: inQty * it.price,
      outSum: outs.reduce((s, m) => s + m.sum, 0),
      balance: +balance.toFixed(1),
      balanceSum: balance * it.price,
      low: balance < it.min,
    }
  })
}
