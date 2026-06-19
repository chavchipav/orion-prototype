// ─────────────────────────────────────────────────────────────
// Согласования бюджетодержателя (владелец). Заявки агронома на закупки/работы
// сверх лимита уходят сюда; владелец согласовывает/отклоняет. Демо-данные.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'

export type ApprovalStatus = 'ждёт' | 'согласовано' | 'отклонено'
export type Approval = {
  id: string; title: string; amount: string; requester: string
  field?: string; tone: 'risk' | 'warn' | 'ok'; status: ApprovalStatus; date: string
}

let _id = 100
const nid = () => 'ap' + ++_id

const INIT: Approval[] = [
  { id: 'ap1', title: 'Закупка СЗР от заразихи (ХБ07)', amount: '1.2 млн ₽', requester: 'агроном Виктор С.', field: 'ХБ07', tone: 'risk', status: 'ждёт', date: '15.07' },
  { id: 'ap2', title: 'Аренда опрыскивателя «Туман-3»', amount: '340 тыс ₽', requester: 'агроном Виктор С.', tone: 'warn', status: 'ждёт', date: '14.07' },
  { id: 'ap3', title: 'Десикация перед уборкой', amount: '610 тыс ₽', requester: 'агроном Виктор С.', tone: 'ok', status: 'ждёт', date: '13.07' },
]

type Ctx = {
  approvals: Approval[]
  pendingCount: number
  submit: (a: Omit<Approval, 'id' | 'status' | 'date'>) => void
  decide: (id: string, ok: boolean) => void
}
const ApprovalCtx = createContext<Ctx | null>(null)

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const [approvals, setApprovals] = useState<Approval[]>(INIT)
  const submit: Ctx['submit'] = (a) => setApprovals((s) => [{ ...a, id: nid(), status: 'ждёт', date: '15.07' }, ...s])
  const decide: Ctx['decide'] = (id, ok) => setApprovals((s) => s.map((x) => (x.id === id ? { ...x, status: ok ? 'согласовано' : 'отклонено' } : x)))
  const pendingCount = approvals.filter((a) => a.status === 'ждёт').length
  return <ApprovalCtx.Provider value={{ approvals, pendingCount, submit, decide }}>{children}</ApprovalCtx.Provider>
}

export function useApprovals() {
  const c = useContext(ApprovalCtx)
  if (!c) throw new Error('useApprovals outside provider')
  return c
}
