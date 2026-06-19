import { useState } from 'react'
import { AG_CLIENTS } from '../agronomData2'
import { statusColor, type FieldStatus } from '../agronomData'
import { useAgro } from '../agroStore'
import { useApp } from '../store'
import { Plus, ChevronRight, Building2, X, Map as MapIcon, Eye, Phone, AlertTriangle } from 'lucide-react'
import { hash } from '../utils'

type Client = typeof AG_CLIENTS[number]
type FarmIssue = { field: string; crop: string; problem: string; status: 'открыта' | 'обработка' | 'закрыта' }

const CROPS = ['Озимая пшеница', 'Подсолнечник', 'Кукуруза', 'Соя', 'Яровой ячмень']
const PROBLEMS = ['Фузариоз колоса', 'Заразиха', 'Луговой мотылёк', 'Засушливый стресс', 'Септориоз', 'Сетчатая пятнистость']

// синтетические проблемы консультируемого хозяйства (детерминированно по id)
function consultIssues(c: Client): FarmIssue[] {
  const seed = hash(c.id)
  const n = c.status === 'risk' ? 3 + (seed % 2) : c.status === 'warn' ? 1 + (seed % 2) : (seed % 2)
  const out: FarmIssue[] = []
  for (let i = 0; i < n; i++) {
    const h = hash(c.id + i)
    out.push({ field: `Поле №${5 + (h % 40)}`, crop: CROPS[h % CROPS.length], problem: PROBLEMS[(h >> 3) % PROBLEMS.length], status: i === 0 && c.status === 'risk' ? 'открыта' : (h % 3 === 0 ? 'обработка' : (h % 3 === 1 ? 'открыта' : 'закрыта')) })
  }
  return out
}

export function Clients() {
  const { issues } = useAgro()
  const { go } = useApp()
  const [open, setOpen] = useState<Client | null>(null)

  // открытые проблемы по хозяйству: своё — из общего цикла, консультируемые — синтетика
  const ownOpen = issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив')
  const openFor = (c: Client) => c.role === 'Своё' ? ownOpen.length : consultIssues(c).filter((x) => x.status === 'открыта').length
  const statusOf = (n: number): FieldStatus => n >= 3 ? 'risk' : n >= 1 ? 'warn' : 'ok'

  const total = AG_CLIENTS.reduce((s, c) => s + c.ha, 0)
  const needDecision = AG_CLIENTS.reduce((s, c) => s + openFor(c), 0)

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-ink">Клиенты</h2><p className="text-sm text-muted">Режим консультанта · хозяйства в работе · клик по строке → досье</p></div>
        <button className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus size={16} />Подключить хозяйство</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi v={String(AG_CLIENTS.length)} l="хозяйств" />
        <Kpi v={`${total.toLocaleString('ru-RU')} га`} l="под управлением" />
        <Kpi v={String(AG_CLIENTS.filter((c) => c.role === 'Своё').length)} l="своих · остальные консультирую" />
        <Kpi v={String(needDecision)} l="полей требуют решения" accent />
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden max-w-4xl">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Хозяйство</th><th className="text-left font-medium p-3">Регион</th>
            <th className="text-right font-medium p-3">Площадь</th><th className="text-right font-medium p-3">Полей</th>
            <th className="text-left font-medium p-3">Доступ</th><th className="text-left font-medium p-3">Состояние</th><th></th>
          </tr></thead>
          <tbody>
            {AG_CLIENTS.map((c) => {
              const open = openFor(c); const st = statusOf(open)
              return (
                <tr key={c.id} onClick={() => setOpen(c)} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer">
                  <td className="p-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-canvas grid place-items-center text-muted"><Building2 size={15} /></div><span className="font-semibold text-ink">{c.name}</span></div></td>
                  <td className="p-3 text-muted">{c.region}</td>
                  <td className="p-3 text-right">{c.ha.toLocaleString('ru-RU')} га</td>
                  <td className="p-3 text-right">{c.fields}</td>
                  <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.role === 'Своё' ? 'bg-brand-soft text-brand' : 'bg-sky-soft text-sky'}`}>{c.role}</span></td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(st) }} />{open > 0 ? `${open} требуют решения` : 'норма'}</span></td>
                  <td className="p-3 text-right"><ChevronRight size={16} className="text-muted" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && <FarmModal c={open} ownIssues={ownOpen} onClose={() => setOpen(null)} go={go} />}
    </div>
  )
}

function FarmModal({ c, ownIssues, onClose, go }: { c: Client; ownIssues: ReturnType<typeof useAgro>['issues']; onClose: () => void; go: ReturnType<typeof useApp>['go'] }) {
  const own = c.role === 'Своё'
  const farmIssues: FarmIssue[] = own
    ? ownIssues.map((i) => ({ field: i.fieldName, crop: i.crop, problem: i.problem.name, status: i.status === 'рецидив' ? 'открыта' : (i.status as FarmIssue['status']) }))
    : consultIssues(c)
  const openCount = farmIssues.filter((x) => x.status === 'открыта').length
  const crops = [...new Set(farmIssues.map((x) => x.crop))]
  const stColor = (s: string) => s === 'закрыта' ? '#2da84f' : s === 'обработка' ? '#e0900a' : '#e5302a'

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-canvas grid place-items-center text-muted"><Building2 size={18} /></div>
            <div><div className="font-bold text-ink">{c.name} <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${own ? 'bg-brand-soft text-brand' : 'bg-sky-soft text-sky'}`}>{c.role}</span></div><div className="text-xs text-muted">{c.region}</div></div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto scroll-thin">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Mini v={`${c.ha.toLocaleString('ru-RU')}`} l="га" /><Mini v={String(c.fields)} l="полей" /><Mini v={String(crops.length || '—')} l="культур" /><Mini v={String(openCount)} l="требуют решения" accent={openCount > 0} />
          </div>

          <div className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5"><AlertTriangle size={15} className="text-warn" />Поля, требующие внимания</div>
          {farmIssues.length ? (
            <div className="rounded-xl border border-line overflow-hidden mb-4">
              <table className="w-full text-sm">
                <tbody>
                  {farmIssues.map((x, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="p-2.5 font-semibold text-ink">{x.field}</td>
                      <td className="p-2.5 text-muted text-xs">{x.crop}</td>
                      <td className="p-2.5">{x.problem}</td>
                      <td className="p-2.5 text-right"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: stColor(x.status) + '22', color: stColor(x.status) }}>{x.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="rounded-xl bg-ok-soft/40 text-ok text-sm font-semibold px-3 py-2 mb-4">Все поля в норме — открытых проблем нет.</div>}

          {crops.length > 0 && <div className="mb-1 text-xs text-muted">Культуры с проблемами: {crops.join(', ')}</div>}
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-end gap-2">
          {own ? (
            <>
              <button onClick={() => { go('agScouting'); onClose() }} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"><Eye size={14} />Осмотры</button>
              <button onClick={() => { go('agMap'); onClose() }} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"><MapIcon size={14} />Перейти к полям</button>
            </>
          ) : (
            <>
              <button className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"><Phone size={14} />Связаться</button>
              <button className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Запросить доступ к полям</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
function Mini({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="rounded-xl bg-canvas p-2.5 text-center"><div className={`text-lg font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-[10px] text-muted">{l}</div></div>
}
