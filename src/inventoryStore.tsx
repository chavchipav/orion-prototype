// ─────────────────────────────────────────────────────────────
// Склад (приходная часть). Расход вычисляется в экранах из agroStore
// (работы → ГСМ + СЗР по норме). Здесь — закупки и оприходование
// закрытых заявок маркетплейса (петля: склад → заявка → дистрибьютор → приход).
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'
import { TODAY } from './agronomSeason'
import type { ResType } from './inventoryData'

export type Purchase = {
  id: string
  stockId: string
  name: string
  type: ResType
  unit: string
  qty: number
  price: number     // ₽ за единицу
  date: string
  comment?: string
  viaMarket?: boolean // оприходовано из заявки маркетплейса
}

const INIT: Purchase[] = [
  { id: 'p1', stockId: 'fuel_dt', name: 'Дизельное топливо', type: 'Топливо', unit: 'л', qty: 12000, price: 61, date: '02.06', comment: 'предсезонный завоз' },
  { id: 'p2', stockId: 'szr_prozaro', name: 'Прозаро', type: 'СЗР', unit: 'л', qty: 120, price: 3400, date: '28.05', viaMarket: true },
]

type Ctx = {
  purchases: Purchase[]
  receivedReqIds: string[]
  addPurchase: (p: Omit<Purchase, 'id' | 'date'> & { date?: string }) => void
  receiveRequest: (reqId: string, p: Omit<Purchase, 'id' | 'date' | 'viaMarket'>) => void
  // суммарный приход по складской позиции
  inFor: (stockId: string) => number
}
const Ctx = createContext<Ctx | null>(null)
let _id = 100
const nid = () => 'p' + ++_id

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>(INIT)
  const [receivedReqIds, setReceived] = useState<string[]>([])

  const addPurchase: Ctx['addPurchase'] = (p) =>
    setPurchases((s) => [{ ...p, id: nid(), date: p.date ?? TODAY }, ...s])

  const receiveRequest: Ctx['receiveRequest'] = (reqId, p) => {
    setPurchases((s) => [{ ...p, id: nid(), date: TODAY, viaMarket: true }, ...s])
    setReceived((s) => (s.includes(reqId) ? s : [...s, reqId]))
  }

  const inFor: Ctx['inFor'] = (stockId) =>
    purchases.filter((p) => p.stockId === stockId).reduce((s, p) => s + p.qty, 0)

  return (
    <Ctx.Provider value={{ purchases, receivedReqIds, addPurchase, receiveRequest, inFor }}>
      {children}
    </Ctx.Provider>
  )
}

export function useInventory() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useInventory outside provider')
  return c
}
