// ─────────────────────────────────────────────────────────────
// Общий стор каталога семян: связывает семеновода (публикация + предложения) и
// агронома (подбор + заявка). Заявку семеновод заводит в демо/воронку через seedStore.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'
import { CATALOG, TRIALS, hybridsForRegion, type Crop } from './catalogData'

export type Offer = { id: string; crop: Crop; region: string; hybridIds: string[]; pricePerPU: number; discountPct: number; riskShare: boolean; date: string }
export type ReqStatus = 'новая' | 'демо' | 'воронка' | 'обработана'
export type SeedRequest = { id: string; agronom: string; farm: string; crop: Crop; region: string; hybridId: string; hybridName: string; areaHa: number; status: ReqStatus; date: string }

let _id = 0
const nid = (p: string) => `${p}${++_id}`

// изначально опубликованы все гибриды в регионах, где есть испытания
const PUBLISHED_INIT: { hybridId: string; region: string }[] =
  [...new Set(TRIALS.map((t) => t.hybridId + '|' + t.region))].map((k) => { const [hybridId, region] = k.split('|'); return { hybridId, region } })

const OFFERS_INIT: Offer[] = [
  { id: 'of0', crop: 'Подсолнечник', region: 'Ростовская обл.', hybridIds: ['esgenesis', 'iskander', 'arev'], pricePerPU: 9800, discountPct: 10, riskShare: true, date: '01.06' },
]
const REQUESTS_INIT: SeedRequest[] = [
  { id: 'rq0', agronom: 'Виктор Степанович', farm: 'Агрофирма «Заря»', crop: 'Подсолнечник', region: 'Ростовская обл.', hybridId: 'iskander', hybridName: 'Искандер', areaHa: 320, status: 'новая', date: '10.06' },
]

type Ctx = {
  published: { hybridId: string; region: string }[]
  offers: Offer[]
  requests: SeedRequest[]
  isPublished: (hybridId: string, region: string) => boolean
  togglePublish: (hybridId: string, region: string) => void
  publishOffer: (o: Omit<Offer, 'id' | 'date'>) => void
  submitRequest: (r: Omit<SeedRequest, 'id' | 'status' | 'date'>) => void
  setRequestStatus: (id: string, status: ReqStatus) => void
  catalogFor: (crop: Crop, region: string) => typeof CATALOG
  newRequestCount: number
}
const CatalogCtx = createContext<Ctx | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [published, setPublished] = useState(PUBLISHED_INIT)
  const [offers, setOffers] = useState<Offer[]>(OFFERS_INIT)
  const [requests, setRequests] = useState<SeedRequest[]>(REQUESTS_INIT)

  const isPublished = (hybridId: string, region: string) => published.some((p) => p.hybridId === hybridId && p.region === region)
  const togglePublish = (hybridId: string, region: string) =>
    setPublished((arr) => arr.some((p) => p.hybridId === hybridId && p.region === region)
      ? arr.filter((p) => !(p.hybridId === hybridId && p.region === region))
      : [...arr, { hybridId, region }])
  const publishOffer = (o: Omit<Offer, 'id' | 'date'>) => {
    setOffers((arr) => [{ ...o, id: nid('of'), date: '14.06' }, ...arr])
    // публикация предложения = публикация выбранных гибридов в регионе
    setPublished((arr) => {
      const add = o.hybridIds.filter((hid) => !arr.some((p) => p.hybridId === hid && p.region === o.region)).map((hid) => ({ hybridId: hid, region: o.region }))
      return [...arr, ...add]
    })
  }
  const submitRequest = (r: Omit<SeedRequest, 'id' | 'status' | 'date'>) =>
    setRequests((arr) => [{ ...r, id: nid('rq'), status: 'новая', date: '14.06' }, ...arr])
  const setRequestStatus = (id: string, status: ReqStatus) =>
    setRequests((arr) => arr.map((x) => (x.id === id ? { ...x, status } : x)))

  const catalogFor = (crop: Crop, region: string) =>
    hybridsForRegion(crop, region).filter((h) => isPublished(h.id, region))

  const newRequestCount = requests.filter((r) => r.status === 'новая').length

  return (
    <CatalogCtx.Provider value={{ published, offers, requests, isPublished, togglePublish, publishOffer, submitRequest, setRequestStatus, catalogFor, newRequestCount }}>
      {children}
    </CatalogCtx.Provider>
  )
}

export function useCatalog() {
  const c = useContext(CatalogCtx)
  if (!c) throw new Error('useCatalog outside provider')
  return c
}
