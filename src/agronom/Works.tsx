import { useState } from 'react'
import { WORKS } from '../agronomData2'
import { useAgro } from '../agroStore'
import { Plus, Layers, Link2, Check } from 'lucide-react'

const stTone = (s: string) => s === 'Факт' ? 'bg-ok-soft text-ok' : s === 'В работе' ? 'bg-warn-soft text-warn' : 'bg-canvas text-muted'

type Row = { id: string; field: string; op: string; date: string; tech: string; operator: string; ha: number; status: string; issueId?: string; problem?: string }

export function Works() {
  const { issues, markWorkDone } = useAgro()
  const [sel, setSel] = useState<Set<string>>(new Set())

  // работы из цикла проблем (обработки по рекомендациям) + обычные полевые работы
  const issueRows: Row[] = issues.filter((i) => i.work).map((i) => ({ id: i.id, field: i.fieldName, op: i.work!.op, date: i.work!.date, tech: i.work!.tech, operator: i.work!.operator, ha: i.work!.ha, status: i.work!.status, issueId: i.id, problem: i.problem.name }))
  const genericRows: Row[] = WORKS.map((w) => ({ id: w.id, field: w.field, op: w.op, date: w.date, tech: w.tech, operator: w.operator, ha: w.ha, status: w.status }))
  const rows = [...issueRows, ...genericRows]

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const all = sel.size === rows.length

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-ink">Контроль работ</h2><p className="text-sm text-muted">План → факт. Обработки по проблемам связаны с осмотрами и рекомендациями.</p></div>
        <div className="flex gap-2">
          {sel.size > 0 && <button className="flex items-center gap-1.5 bg-ink text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Layers size={15} />Пакетно: {sel.size} полей</button>}
          <button className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus size={16} />Добавить работу</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi v={String(rows.filter((r) => r.status === 'План').length)} l="план" />
        <Kpi v={String(rows.filter((r) => r.status === 'В работе').length)} l="в работе" accent />
        <Kpi v={String(rows.filter((r) => r.status === 'Факт').length)} l="факт" />
        <Kpi v={String(issueRows.length)} l="обработок по проблемам" />
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="p-3 w-8"><input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
            <th className="text-left font-medium p-3">Поле</th><th className="text-left font-medium p-3">Операция</th><th className="text-left font-medium p-3">Дата</th>
            <th className="text-left font-medium p-3">Техника · механизатор</th><th className="text-right font-medium p-3">Площадь</th><th className="text-left font-medium p-3">Статус</th><th className="text-left font-medium p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className={`border-b border-line last:border-0 hover:bg-canvas ${sel.has(w.id) ? 'bg-brand-soft/30' : ''}`}>
                <td className="p-3"><input type="checkbox" checked={sel.has(w.id)} onChange={() => toggle(w.id)} /></td>
                <td className="p-3 font-semibold text-ink">{w.field}</td>
                <td className="p-3">{w.op}{w.problem && <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-brand bg-brand-soft px-1.5 py-0.5 rounded-md"><Link2 size={10} />{w.problem}</span>}</td>
                <td className="p-3 text-muted">{w.date}</td>
                <td className="p-3 text-muted">{w.tech} · {w.operator}</td>
                <td className="p-3 text-right">{w.ha} га</td>
                <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stTone(w.status)}`}>{w.status}</span></td>
                <td className="p-3">{w.issueId && w.status === 'В работе' && <button onClick={() => markWorkDone(w.issueId!)} className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><Check size={13} />Факт</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <p className="text-xs text-muted mt-3">Работы со <span className="text-brand font-semibold">связью</span> — обработки по проблемам: отметка «Факт» закрывает проблему в осмотрах и рекомендациях.</p>
    </div>
  )
}
function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
