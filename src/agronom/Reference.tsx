import { useState, type ReactNode } from 'react'
import { REG_SZR, REG_FERT, REG_VARIETIES, REG_ORIGINATORS, REG_TECH, REG_COUNTS } from '../registryData'
import { Search, Database, Building2 } from 'lucide-react'

const TABS = [
  { k: 'sorts', l: 'Сорта · гибриды' }, { k: 'szr', l: 'СЗР · пестициды' },
  { k: 'fert', l: 'Удобрения' }, { k: 'tech', l: 'Техника' }, { k: 'orig', l: 'Оригинаторы' },
]
const CROP_COLOR: Record<string, string> = { 'Подсолнечник': '#b653b0', 'Кукуруза': '#e0a92b', 'Соя': '#3f7fd6', 'Пшеница': '#2e9e57', 'Ячмень': '#cdbb3a', 'Горох': '#5fc7c2' }
const CROPS = ['Подсолнечник', 'Кукуруза', 'Соя', 'Пшеница', 'Ячмень', 'Горох']

export function Reference() {
  const [tab, setTab] = useState('sorts')
  const [q, setQ] = useState('')
  const [crop, setCrop] = useState('все')
  const f = (...ss: string[]) => !q || ss.some((s) => (s || '').toLowerCase().includes(q.toLowerCase()))
  const cf = (c: string) => crop === 'все' || c === crop

  const total = (REG_COUNTS as Record<string, number>)[tab === 'sorts' ? 'varieties' : tab === 'orig' ? 'originators' : tab] ?? 0
  const shown = tab === 'sorts' ? REG_VARIETIES.filter((v) => f(v.name, v.originator) && cf(v.crop)).length
    : tab === 'szr' ? REG_SZR.filter((s) => f(s.name, s.ai, s.target) && cf(s.crop)).length
    : tab === 'fert' ? REG_FERT.filter((x) => f(x.name, x.group)).length
    : tab === 'tech' ? REG_TECH.filter((t) => f(t.name, t.maker)).length
    : REG_ORIGINATORS.filter((o) => f(o)).length

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <h2 className="text-xl font-bold text-ink mb-1 flex items-center gap-2"><Database size={19} className="text-brand" />Справочники</h2>
      <p className="text-sm text-muted mb-4">Реальные данные из открытых госреестров (Минсельхоз/Россельхозцентр): сорта и гибриды, пестициды, удобрения, техника, оригинаторы.</p>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="inline-flex gap-1 bg-white border border-line rounded-xl p-1 flex-wrap">
          {TABS.map((t) => <button key={t.k} onClick={() => { setTab(t.k); setCrop('все') }} className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === t.k ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>{t.l}</button>)}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-xl w-64">
          <Search size={15} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по реестру…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      {(tab === 'sorts' || tab === 'szr') && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['все', ...CROPS].map((c) => <button key={c} onClick={() => setCrop(c)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${crop === c ? 'bg-brand text-white border-brand' : 'bg-white border-line text-muted hover:text-ink'}`}>{c}</button>)}
        </div>
      )}

      <div className="text-xs text-muted mb-2">Показано <b className="text-ink">{shown}</b> из <b className="text-ink">{total.toLocaleString('ru-RU')}</b> записей реестра{tab === 'sorts' || tab === 'szr' ? ' (выборка под культуры фермы)' : ''}.</div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {tab === 'sorts' && (
          <Table head={['Культура', 'Сорт / гибрид', 'Оригинатор']}>
            {REG_VARIETIES.filter((v) => f(v.name, v.originator) && cf(v.crop)).map((v, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="p-2.5"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLOR[v.crop] || '#999' }} />{v.crop}</span></td>
                <td className="p-2.5 font-semibold text-ink">{v.name}</td><td className="p-2.5 text-muted">{v.originator}</td>
              </tr>))}
          </Table>
        )}
        {tab === 'szr' && (
          <Table head={['Препарат', 'Тип', 'Действующее вещество', 'Культура', 'Объект']}>
            {REG_SZR.filter((s) => f(s.name, s.ai, s.target) && cf(s.crop)).map((s, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="p-2.5 font-semibold text-ink">{s.name}</td>
                <td className="p-2.5"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-canvas text-muted">{s.type}</span></td>
                <td className="p-2.5 text-muted">{s.ai || '—'}</td>
                <td className="p-2.5"><span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ background: CROP_COLOR[s.crop] || '#999' }} />{s.crop}</span></td>
                <td className="p-2.5 text-muted text-xs">{s.target}</td>
              </tr>))}
          </Table>
        )}
        {tab === 'fert' && (
          <Table head={['Удобрение', 'Группа', 'NPK', 'Доза', 'Культура']}>
            {REG_FERT.filter((x) => f(x.name, x.group)).map((x, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="p-2.5 font-semibold text-ink">{x.name}</td><td className="p-2.5 text-muted text-xs">{x.group}</td>
                <td className="p-2.5 text-ink">{x.npk || '—'}</td><td className="p-2.5 text-muted text-xs">{x.dose}</td><td className="p-2.5 text-muted text-xs">{x.crop}</td>
              </tr>))}
          </Table>
        )}
        {tab === 'tech' && (
          <Table head={['Марка / модель', 'Производитель']}>
            {REG_TECH.filter((t) => f(t.name, t.maker)).map((t, i) => (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="p-2.5 font-semibold text-ink">{t.name}</td><td className="p-2.5 text-muted">{t.maker}</td>
              </tr>))}
          </Table>
        )}
        {tab === 'orig' && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {REG_ORIGINATORS.filter((o) => f(o)).map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-canvas rounded-lg px-3 py-2"><Building2 size={14} className="text-muted shrink-0" /><span className="text-ink truncate">{o}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">{head.map((h) => <th key={h} className="text-left font-medium p-2.5">{h}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  )
}
