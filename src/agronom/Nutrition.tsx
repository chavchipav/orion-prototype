import { useState } from 'react'
import { FERT_LOG, FERTS, appMetrics, fertById, type FertApp } from '../fertData'
import { CROP_COLORS, type Crop } from '../agronomData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { Download, Droplets } from 'lucide-react'

const KIND_COLOR: Record<string, string> = { 'Азотное': '#2b6def', 'Сложное': '#7c5cff', 'Калийное': '#e0900a', 'Микро': '#2da84f' }
const rub = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + ' млн ₽' : Math.round(n).toLocaleString('ru-RU') + ' ₽')

export function Nutrition() {
  const [crop, setCrop] = useState<string>('Все')
  const log = crop === 'Все' ? FERT_LOG : FERT_LOG.filter((a) => a.crop === crop)
  const crops = ['Все', ...new Set(FERT_LOG.map((a) => a.crop))]

  let physT = 0, nT = 0, pT = 0, kT = 0, cost = 0, area = 0
  const byProduct: Record<string, number> = {}
  const byFieldN: Record<string, { field: string; n: number }> = {}
  for (const a of log) {
    const m = appMetrics(a)
    physT += m.physT; nT += m.nT; pT += m.pT; kT += m.kT; cost += m.cost; area += a.areaHa
    byProduct[m.name] = (byProduct[m.name] || 0) + m.physT
    const f = fertById(a.fertId)
    byFieldN[a.fieldId] ||= { field: a.field, n: 0 }
    byFieldN[a.fieldId].n += a.normKgHa * f.n / 100
  }
  const fields = new Set(log.map((a) => a.fieldId)).size
  const prodData = FERTS.filter((f) => byProduct[f.name]).map((f) => ({ name: f.name, t: Math.round(byProduct[f.name] * 10) / 10, kind: f.kind }))
  const fieldData = Object.values(byFieldN).map((x) => ({ field: x.field, n: Math.round(x.n) })).sort((a, b) => b.n - a.n).slice(0, 10)

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-ink flex items-center gap-2"><Droplets size={20} className="text-brand" />Питание · удобрения и добавки</h2><p className="text-sm text-muted">Учёт внесения по полям и статистика NPK (из техкарт и работ) · сезон 2026</p></div>
        <div className="flex items-center gap-3">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">{crops.map((c) => <option key={c}>{c}</option>)}</select>
          <button className="flex items-center gap-1.5 bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold"><Download size={15} />Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <Kpi v={`${Math.round(physT)} т`} l="внесено (физ. вес)" />
        <Kpi v={`${Math.round(nT)} т`} l={`азот N · ${area ? Math.round(nT * 1000 / area) : 0} кг/га`} accent />
        <Kpi v={`${Math.round(pT)} т`} l={`фосфор P₂O₅ · ${area ? Math.round(pT * 1000 / area) : 0} кг/га`} />
        <Kpi v={`${Math.round(kT)} т`} l={`калий K₂O · ${area ? Math.round(kT * 1000 / area) : 0} кг/га`} />
        <Kpi v={rub(cost)} l={`затраты · ${fields} полей`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="font-bold text-ink mb-3">Внесение по продуктам, т</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} /><Tooltip />
                <Bar dataKey="t" radius={[0, 5, 5, 0]} isAnimationActive={false}>{prodData.map((d, i) => <Cell key={i} fill={KIND_COLOR[d.kind]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="font-bold text-ink mb-3">Азот N, кг/га по полям (топ-10)</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fieldData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="field" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="n" name="N кг/га" fill="#2b6def" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3 font-bold text-ink border-b border-line">Журнал внесения · {log.length} операций</div>
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле · культура</th><th className="text-left font-medium p-3">Удобрение</th><th className="text-left font-medium p-3">Фаза</th>
            <th className="text-right font-medium p-3">Дата</th><th className="text-right font-medium p-3">Норма</th><th className="text-right font-medium p-3">Площадь</th>
            <th className="text-right font-medium p-3">Всего, т</th><th className="text-right font-medium p-3">NPK, кг д.в.</th><th className="text-right font-medium p-3">Затраты</th>
          </tr></thead>
          <tbody>
            {log.map((a) => <Row key={a.id} a={a} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ a }: { a: FertApp }) {
  const m = appMetrics(a)
  const f = fertById(a.fertId)
  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas/60">
      <td className="p-3"><div className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[a.crop as Crop] || '#888' }} /><span className="font-semibold text-ink">{a.field}</span></div><div className="text-xs text-muted ml-4">{a.crop}</div></td>
      <td className="p-3"><span className="font-medium text-ink">{f.name}</span><div className="text-[11px] text-muted">{f.kind} · N{f.n} P{f.p} K{f.k}</div></td>
      <td className="p-3 text-muted text-xs">{a.phase}</td>
      <td className="p-3 text-right text-muted">{a.date}</td>
      <td className="p-3 text-right">{a.normKgHa} кг/га</td>
      <td className="p-3 text-right text-muted">{a.areaHa} га</td>
      <td className="p-3 text-right font-semibold">{m.physT.toFixed(1)}</td>
      <td className="p-3 text-right text-xs text-muted">{Math.round(m.nT * 1000)}·{Math.round(m.pT * 1000)}·{Math.round(m.kT * 1000)}</td>
      <td className="p-3 text-right">{rub(m.cost)}</td>
    </tr>
  )
}
function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
