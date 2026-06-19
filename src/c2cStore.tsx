// ─────────────────────────────────────────────────────────────
// Стор C2C-объявлений (фермер ↔ фермер). Объявления добавляются из
// любого кабинета и видны во всех — общий список.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'
import { ADS_INIT, type Ad } from './c2cData'

type Ctx = {
  ads: Ad[]
  addAd: (a: Omit<Ad, 'id' | 'date'> & { date?: string }) => void
}
const C2CCtx = createContext<Ctx | null>(null)
let _id = 100
const nid = () => 'a' + ++_id

export function C2CProvider({ children }: { children: ReactNode }) {
  const [ads, setAds] = useState<Ad[]>(ADS_INIT)
  const addAd: Ctx['addAd'] = (a) => setAds((s) => [{ ...a, id: nid(), date: a.date ?? 'сегодня' }, ...s])
  return <C2CCtx.Provider value={{ ads, addAd }}>{children}</C2CCtx.Provider>
}

export function useC2C() {
  const c = useContext(C2CCtx)
  if (!c) throw new Error('useC2C outside provider')
  return c
}
