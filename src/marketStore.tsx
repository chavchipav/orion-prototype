// ─────────────────────────────────────────────────────────────
// Заявки маркетплейса (СЗР / Удобрения / Техника / Софт) → кабинет дистрибьютора.
// (Семена идут отдельно — семеноводу, через catalogStore.)
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'

export type MarketReqStatus = 'новая' | 'в работе' | 'предложение' | 'закрыта'
export type MarketRequest = { id: string; category: string; product: string; brand: string; farm: string; agronom: string; region: string; detail?: string; status: MarketReqStatus; date: string }

let _id = 0
const nid = () => 'mr' + ++_id

const INIT: MarketRequest[] = [
  { id: nid(), category: 'СЗР', product: 'Прозаро', brand: 'Bayer', farm: 'КФХ Сергеев', agronom: 'Сергей К.', region: 'Ростовская обл.', detail: 'фунгицид, подсолнечник, 240 га', status: 'новая', date: '14.06' },
  { id: nid(), category: 'Техника', product: 'Amazone UX 5200', brand: 'Amazone', farm: 'Агрохолдинг «Степь»', agronom: 'Пётр И.', region: 'Краснодарский край', detail: 'опрыскиватель 24 м', status: 'в работе', date: '12.06' },
]

type Ctx = {
  requests: MarketRequest[]
  newCount: number
  submit: (r: Omit<MarketRequest, 'id' | 'status' | 'date'>) => void
  setStatus: (id: string, status: MarketReqStatus) => void
}
const MarketCtx = createContext<Ctx | null>(null)

export function MarketProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<MarketRequest[]>(INIT)
  const submit: Ctx['submit'] = (r) => setRequests((s) => [{ ...r, id: nid(), status: 'новая', date: '15.06' }, ...s])
  const setStatus: Ctx['setStatus'] = (id, status) => setRequests((s) => s.map((x) => (x.id === id ? { ...x, status } : x)))
  const newCount = requests.filter((r) => r.status === 'новая').length
  return <MarketCtx.Provider value={{ requests, newCount, submit, setStatus }}>{children}</MarketCtx.Provider>
}

export function useMarket() {
  const c = useContext(MarketCtx)
  if (!c) throw new Error('useMarket outside provider')
  return c
}
