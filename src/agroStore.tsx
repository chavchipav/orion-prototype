// ─────────────────────────────────────────────────────────────
// Единый цикл агрономической проблемы (спина кабинета).
// Issue связывает: осмотр → рекомендация → работа → эффект, с одним статусом.
// Все экраны (Осмотры, Рекомендации, Работы, Сезон-кокпит, Карта) читают/меняют этот стор.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, type ReactNode } from 'react'
import { AG_FIELDS, type Crop } from './agronomData'
import { fieldSeason, TODAY } from './agronomSeason'

export type IssueStatus = 'открыта' | 'обработка' | 'закрыта' | 'рецидив'
export type IssueWork = { op: string; date: string; tech: string; operator: string; ha: number; status: 'План' | 'В работе' | 'Факт' }
export type Issue = {
  id: string; fieldId: string; fieldName: string; crop: Crop; sort: string; areaHa: number
  problem: { name: string; kind: string; phase: string; dev: string; spread: number }
  openedDate: string; status: IssueStatus
  rec: { text: string; product: string; agronom: string }
  work?: IssueWork
  effect: string
}

const AGRONOMS = ['Пётр И.', 'Сергей К.']
const TECHS = ['Amazone UX 5200', 'МТЗ-1221', 'John Deere 8R']
const OPERATORS = ['Иванов А.', 'Петров С.', 'Сидоров К.']
function opForKind(kind: string) {
  return kind.includes('Болезн') ? 'Фунгицидная обработка' : kind.includes('Вредит') ? 'Инсектицидная обработка' : kind.includes('Сорняк') ? 'Гербицидная обработка' : 'Опрыскивание'
}
function effectFor(status: IssueStatus) {
  return status === 'закрыта' ? 'NDVI восстановился — потери предотвращены'
    : status === 'обработка' ? 'Обработка проведена, ждём отклика NDVI'
      : status === 'рецидив' ? 'Эффект частичный — нужна повторная обработка'
        : 'Требует решения: окно обработки закрывается'
}

function buildIssues(): Issue[] {
  const out: Issue[] = []
  AG_FIELDS.forEach((f, i) => {
    const p = fieldSeason(f, 2026).problems[0]
    if (!p) return
    const treated = p.status !== 'открыта'
    out.push({
      id: 'iss-' + f.id, fieldId: f.id, fieldName: f.name, crop: f.crop, sort: f.sort, areaHa: f.areaHa,
      problem: { name: p.name, kind: p.kind, phase: p.phase, dev: p.dev, spread: p.spread },
      openedDate: p.openedDate, status: p.status,
      rec: { text: p.recSource || `Обработка: ${p.product} в фазу ${p.phase}`, product: p.product, agronom: AGRONOMS[i % 2] },
      work: treated ? { op: opForKind(p.kind), date: p.treatmentDate || p.openedDate, tech: TECHS[i % 3], operator: OPERATORS[i % 3], ha: f.areaHa, status: p.status === 'закрыта' ? 'Факт' : 'В работе' } : undefined,
      effect: p.effect,
    })
  })
  const order: Record<IssueStatus, number> = { 'рецидив': 0, 'открыта': 1, 'обработка': 2, 'закрыта': 3 }
  return out.sort((a, b) => order[a.status] - order[b.status])
}

type Ctx = {
  issues: Issue[]
  issueForField: (fieldId: string) => Issue | undefined
  openCount: number
  recommend: (id: string) => void   // открыта → обработка (принять рекомендацию, создать работу)
  markWorkDone: (id: string) => void // обработка/рецидив → закрыта (факт работы, эффект)
  reopen: (id: string) => void       // закрыта → рецидив (повторная вспышка)
}
const AgroCtx = createContext<Ctx | null>(null)

export function AgroProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(buildIssues)
  const patch = (id: string, fn: (x: Issue) => Issue) => setIssues((arr) => arr.map((x) => (x.id === id ? fn(x) : x)))

  const recommend = (id: string) => patch(id, (x) => {
    const i = AG_FIELDS.findIndex((f) => f.id === x.fieldId)
    return { ...x, status: 'обработка', effect: effectFor('обработка'), work: { op: opForKind(x.problem.kind), date: TODAY, tech: TECHS[i % 3], operator: OPERATORS[i % 3], ha: x.areaHa, status: 'В работе' } }
  })
  const markWorkDone = (id: string) => patch(id, (x) => ({ ...x, status: 'закрыта', effect: effectFor('закрыта'), work: x.work ? { ...x.work, status: 'Факт', date: x.work.date || TODAY } : { op: opForKind(x.problem.kind), date: TODAY, tech: TECHS[0], operator: OPERATORS[0], ha: x.areaHa, status: 'Факт' } }))
  const reopen = (id: string) => patch(id, (x) => ({ ...x, status: 'рецидив', effect: effectFor('рецидив'), work: x.work ? { ...x.work, status: 'В работе' } : undefined }))

  const issueForField = (fieldId: string) => issues.find((x) => x.fieldId === fieldId)
  const openCount = issues.filter((x) => x.status === 'открыта' || x.status === 'рецидив').length

  return <AgroCtx.Provider value={{ issues, issueForField, openCount, recommend, markWorkDone, reopen }}>{children}</AgroCtx.Provider>
}

export function useAgro() {
  const c = useContext(AgroCtx)
  if (!c) throw new Error('useAgro outside provider')
  return c
}

export function issueStatusColor(s: IssueStatus) {
  return s === 'закрыта' ? '#2da84f' : s === 'обработка' ? '#e0900a' : '#e5302a'
}
