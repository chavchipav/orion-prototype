import { createContext, useContext, useState, type ReactNode } from 'react'
import { useSeed } from './seedStore'
import { HYBRIDS, dealValue } from './seedData'
import { REGISTRY_ROWS } from './crmAccountsData'
import { buildAccounts, BUDGET_INIT, type Account, type Contact, type Case, type CaseStatus, type SalesTask, type BudgetLine } from './crmData'

const ACCOUNTS = buildAccounts(REGISTRY_ROWS)
const accById = (id: string) => ACCOUNTS.find((a) => a.id === id)
const hybridName = (id: string) => HYBRIDS.find((h) => h.id === id)?.name ?? HYBRIDS[0].name
const caseAmount = (a: Account) => dealValue(hybridName(a.fitHybridId), Math.round(a.areaHa * 0.4))
const PROB_BY: Record<CaseStatus, number> = { 'черновик': 0.2, 'в Баттле': 0.4, 'оффер': 0.6, 'выигран': 1, 'проигран': 0 }

let _n = 0
const nid = (p: string) => `${p}${Date.now() % 100000}_${_n++}`

// демо-затравка: пара контактов/кейсов/задач по профильным аккаунтам
const CONTACTS_INIT: Contact[] = [
  { id: 'c1', accountId: 'p_1', name: ACCOUNTS.find((a) => a.id === 'p_1')!.contactName, role: 'гл. агроном', phone: '+7 928 ***-21', nextAction: 'выслать кейс по Гелиос-310', due: '18.06', status: 'дозвон' },
  { id: 'c2', accountId: 'p_3', name: ACCOUNTS.find((a) => a.id === 'p_3')!.contactName, role: 'директор', phone: '+7 918 ***-04', nextAction: 'согласовать демо-участок', due: '20.06', status: 'встреча' },
]
const CASES_INIT: Case[] = [
  { id: 'k1', accountId: 'p_0', hybridId: 'gelios310', status: 'в Баттле', note: 'Демо рядом с Pioneer — засуха, Юг', amountRub: caseAmount(accById('p_0')!), prob: 0.4, nextStep: 'дождаться уборки демо, собрать карточку «проверено полем»', blocker: 'нет факта урожая до уборки' },
  { id: 'k2', accountId: 'p_6', hybridId: 'orionS', status: 'оффер', note: 'Орион-С, Поволжье — оффер с риск-шерингом', amountRub: caseAmount(accById('p_6')!), prob: 0.6, nextStep: 'согласовать аванс 60% и сроки поставки', blocker: 'ждёт решения по бюджету закупки' },
]
const TASKS_INIT: SalesTask[] = [
  { id: 't1', accountId: 'p_2', text: 'Позвонить, договориться о выезде на поле', due: '17.06', owner: 'Менеджер Олег', status: 'новая' },
  { id: 't2', accountId: 'p_1', text: 'Вернуться после ЮгАгро — прислать «проверено полем»', due: '19.06', owner: 'Надежда', status: 'в работе' },
]

type CrmCtx = {
  accounts: Account[]
  contacts: Contact[]
  cases: Case[]
  tasks: SalesTask[]
  budget: BudgetLine[]
  engaged: Set<string>          // accountId, по которым уже есть контакт/кейс/лид
  addContact: (a: Account) => void
  addCase: (a: Account) => void
  addSalesTask: (accountId: string, text: string, due: string, owner: string) => void
  setTaskStatus: (id: string, status: SalesTask['status']) => void
  setContactStatus: (id: string, status: Contact['status']) => void
  setCaseStatus: (id: string, status: Case['status']) => void
  setBudget: (channel: string, field: 'planRub' | 'spentRub', value: number) => void
  requestConsent: (accountId: string) => void  // запросить согласие хозяйства на шеринг (U2)
  toFunnel: (a: Account) => void   // завести лид (seed-воронка)
  toDemo: (a: Account) => void     // завести демо (seed «Баттл»)
}

const Ctx = createContext<CrmCtx | null>(null)

export function CrmProvider({ children }: { children: ReactNode }) {
  const { addLead, addDemo } = useSeed()
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS)
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS_INIT)
  const [cases, setCases] = useState<Case[]>(CASES_INIT)
  const [tasks, setTasks] = useState<SalesTask[]>(TASKS_INIT)
  const [budget, setBudgetState] = useState<BudgetLine[]>(BUDGET_INIT)
  const [extraEngaged, setExtraEngaged] = useState<string[]>([])

  const engaged = new Set<string>([
    ...contacts.map((c) => c.accountId), ...cases.map((c) => c.accountId), ...tasks.map((t) => t.accountId), ...extraEngaged,
  ])

  const addContact = (a: Account) => setContacts((s) => s.some((c) => c.accountId === a.id) ? s
    : [{ id: nid('c'), accountId: a.id, name: a.contactName, role: 'ЛПР', phone: '+7 9** ***-**', nextAction: 'первый звонок', due: '—', status: 'новый' }, ...s])
  const addCase = (a: Account) => setCases((s) => [{ id: nid('k'), accountId: a.id, hybridId: a.fitHybridId, status: 'в Баттле', note: `Демо ${hybridName(a.fitHybridId)} в зоне «${a.zone}»`, amountRub: caseAmount(a), prob: PROB_BY['в Баттле'], nextStep: 'дождаться результата демо, собрать карточку', blocker: 'нет факта урожая до уборки' }, ...s])
  const requestConsent = (accountId: string) => setAccounts((s) => s.map((a) => a.id === accountId ? { ...a, consent: { yield: true, ndvi: true, agro: a.consent.agro }, consentDate: a.consentDate ?? '17.06.2026' } : a))
  const addSalesTask = (accountId: string, text: string, due: string, owner: string) => setTasks((s) => [{ id: nid('t'), accountId, text, due, owner, status: 'новая' }, ...s])
  const setTaskStatus = (id: string, status: SalesTask['status']) => setTasks((s) => s.map((t) => t.id === id ? { ...t, status } : t))
  const setContactStatus = (id: string, status: Contact['status']) => setContacts((s) => s.map((c) => c.id === id ? { ...c, status } : c))
  const setCaseStatus = (id: string, status: Case['status']) => setCases((s) => s.map((c) => c.id === id ? { ...c, status, prob: PROB_BY[status] } : c))
  const setBudget = (channel: string, field: 'planRub' | 'spentRub', value: number) => setBudgetState((s) => s.map((b) => b.channel === channel ? { ...b, [field]: value } : b))

  const toFunnel = (a: Account) => {
    addLead({ farm: a.short, zone: a.zone, hybrid: hybridName(a.fitHybridId), areaHa: Math.round(a.areaHa * 0.4), stage: 'лид', channel: a.channel })
    setExtraEngaged((s) => [...s, a.id])
  }
  const toDemo = (a: Account) => {
    addDemo({ farm: a.short, zone: a.zone, region: a.region, myHybrid: hybridName(a.fitHybridId), rival: 'контроль (стандарт)', sown: '14.06', status: 'посеян', ndviMine: 0.30, ndviRival: 0.30, areaHa: Math.round(a.areaHa * 0.05), source: a.channel })
    addLead({ farm: a.short, zone: a.zone, hybrid: hybridName(a.fitHybridId), areaHa: Math.round(a.areaHa * 0.4), stage: 'демо', channel: a.channel })
    addCase(a)
    setExtraEngaged((s) => [...s, a.id])
  }

  return (
    <Ctx.Provider value={{ accounts, contacts, cases, tasks, budget, engaged, addContact, addCase, addSalesTask, setTaskStatus, setContactStatus, setCaseStatus, setBudget, requestConsent, toFunnel, toDemo }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCrm() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCrm outside provider')
  return c
}
