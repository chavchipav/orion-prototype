import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  HYBRIDS, DEMOS_INIT, CLIENT_FIELDS_INIT, CONTRACTS_INIT, LOTS_INIT, LEADS_INIT, TASKS_INIT, PROD_INIT,
  PU_PER_HA, PRICE_BY_HYBRID,
  type Demo, type ClientField, type Contract, type Lot, type Lead, type SeedTask, type ProdRow, type DemoStatus, type LeadStage,
} from './seedData'

type SeedCtx = {
  hybrids: typeof HYBRIDS
  demos: Demo[]
  fields: ClientField[]
  contracts: Contract[]
  lots: Lot[]
  leads: Lead[]
  tasks: SeedTask[]
  prod: ProdRow[]
  addDemo: (d: Omit<Demo, 'id'>) => void
  setDemoStatus: (id: string, status: DemoStatus) => void
  convertDemo: (id: string) => void // демо → контракт + лид в «контракт»
  addTask: (t: Omit<SeedTask, 'id' | 'status'>) => void
  setTaskStatus: (id: string, status: SeedTask['status']) => void
  settleContract: (id: string, actualYield: number) => void
  verifyLot: (id: string) => void
  moveLead: (id: string, stage: LeadStage) => void
  addLead: (l: Omit<Lead, 'id'>) => void
  addContract: (c: Omit<Contract, 'id'>) => void
}

const Ctx = createContext<SeedCtx | null>(null)
let _id = 1000
const nid = (p: string) => `${p}${++_id}`

export function SeedProvider({ children }: { children: ReactNode }) {
  const [demos, setDemos] = useState<Demo[]>(DEMOS_INIT)
  const [fields] = useState<ClientField[]>(CLIENT_FIELDS_INIT)
  const [contracts, setContracts] = useState<Contract[]>(CONTRACTS_INIT)
  const [lots, setLots] = useState<Lot[]>(LOTS_INIT)
  const [leads, setLeads] = useState<Lead[]>(LEADS_INIT)
  const [tasks, setTasks] = useState<SeedTask[]>(TASKS_INIT)
  const [prod] = useState<ProdRow[]>(PROD_INIT)

  const addDemo: SeedCtx['addDemo'] = (d) => setDemos((s) => [{ ...d, id: nid('d') }, ...s])
  const setDemoStatus: SeedCtx['setDemoStatus'] = (id, status) =>
    setDemos((s) => s.map((d) => (d.id === id ? { ...d, status } : d)))

  const addContract: SeedCtx['addContract'] = (c) => setContracts((s) => [{ ...c, id: nid('k') }, ...s])

  const convertDemo: SeedCtx['convertDemo'] = (id) => {
    const d = demos.find((x) => x.id === id)
    setDemos((s) => s.map((x) => (x.id === id ? { ...x, status: 'в контракт' } : x)))
    if (d) {
      const area = d.areaHa ?? 250
      const pu = Math.max(1, Math.round(area * PU_PER_HA))
      const price = PRICE_BY_HYBRID[d.myHybrid] ?? 12000
      const expectedYield = d.yieldMine ?? 3.0
      addContract({ farm: d.farm, hybrid: d.myHybrid, areaHa: area, pu, pricePerPU: price, prepaidPct: 60, status: 'аванс 60%', expectedYield })
      setLeads((s) => {
        const exists = s.find((l) => l.farm === d.farm)
        if (exists) return s.map((l) => (l.farm === d.farm ? { ...l, stage: 'контракт', hybrid: d.myHybrid, areaHa: area } : l))
        return [{ id: nid('g'), farm: d.farm, zone: d.zone, hybrid: d.myHybrid, areaHa: area, stage: 'контракт', channel: 'Демопосев' }, ...s]
      })
    }
  }

  const addTask: SeedCtx['addTask'] = (t) => setTasks((s) => [{ ...t, id: nid('s'), status: 'новая' }, ...s])
  const setTaskStatus: SeedCtx['setTaskStatus'] = (id, status) =>
    setTasks((s) => s.map((t) => (t.id === id ? { ...t, status } : t)))

  const settleContract: SeedCtx['settleContract'] = (id, actualYield) =>
    setContracts((s) => s.map((c) => (c.id === id ? { ...c, actualYield, status: 'закрыт' } : c)))

  const verifyLot: SeedCtx['verifyLot'] = (id) =>
    setLots((s) => s.map((l) => (l.id === id ? { ...l, verified: true, claims: 0 } : l)))

  const moveLead: SeedCtx['moveLead'] = (id, stage) =>
    setLeads((s) => s.map((l) => (l.id === id ? { ...l, stage } : l)))
  const addLead: SeedCtx['addLead'] = (l) => setLeads((s) => [{ ...l, id: nid('g') }, ...s])

  return (
    <Ctx.Provider value={{ hybrids: HYBRIDS, demos, fields, contracts, lots, leads, tasks, prod, addDemo, setDemoStatus, convertDemo, addTask, setTaskStatus, settleContract, verifyLot, moveLead, addLead, addContract }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSeed() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSeed outside provider')
  return c
}
