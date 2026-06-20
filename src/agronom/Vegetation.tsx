import { useMemo, useState } from 'react'
import { AG_FIELDS, CROP_COLORS, statusColor, cvStatus, NDVI_CV_THRESHOLD, regionBenchmark, ndviVsRegion, type AgField } from '../agronomData'
import { useApp } from '../store'
import { Chronology } from './Chronology'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import { ChevronRight, ArrowDownUp, Sparkles } from 'lucide-react'

const MONTHS = ['апр', 'май', 'июн', 'июл', 'авг']
// топ-6 полей по площади для графика
const top = [...AG_FIELDS].sort((a, b) => b.areaHa - a.areaHa).slice(0, 6)

// проблемные поля заметно проседают к концу сезона (видно аномалию)
const DECLINE: Record<string, number[]> = { risk: [0, 0.05, 0.12, 0.2, 0.26], warn: [0, 0, 0.04, 0.09, 0.12], ok: [0, 0, 0, 0, 0] }
function series() {
  const lead = top[0]
  return MONTHS.map((m, i) => {
    const row: Record<string, number | string | number[]> = { m }
    for (const f of top) {
      const shape = [0.45, 0.72, 0.95, 1, 0.9][i] // кривая сезона
      const drop = DECLINE[f.status][i]
      row[f.name] = Math.round(Math.min(0.88, f.ndvi * shape * (1 - drop)) * 100) / 100
    }
    // σ-коридор внутриполевой неоднородности вокруг кривой топ-поля
    const v = row[lead.name] as number
    row.band = [Math.round(v * (1 - lead.ndviCV) * 100) / 100, Math.round(Math.min(0.9, v * (1 + lead.ndviCV)) * 100) / 100]
    return row
  })
}
const DATA = series()
const PAL = ['#fc3f1d', '#2e9e57', '#3f7fd6', '#e0a92b', '#b653b0', '#5fc7c2']

export function Vegetation() {
  const { go } = useApp()
  const [open, setOpen] = useState<AgField | null>(null)
  const [sortCV, setSortCV] = useState(false)

  const rows = useMemo(() => sortCV ? [...AG_FIELDS].sort((a, b) => b.ndviCV - a.ndviCV) : AG_FIELDS, [sortCV])
  const lead = top[0]
  const reg = regionBenchmark(lead.crop) // референс района по культуре топ-поля

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <h2 className="text-xl font-bold text-ink mb-1">Вегетация</h2>
      <p className="text-sm text-muted mb-4">Динамика развития полей по NDVI за сезон — найдите поля, отклоняющиеся от тренда</p>

      <div className="bg-white border border-line rounded-2xl p-5 mb-4">
        <div className="font-bold text-ink mb-1">Динамика NDVI · топ-6 полей</div>
        <div className="text-xs text-muted mb-3">Затенённая лента — σ-коридор поля <b className="text-ink">{lead.name}</b> (CV {lead.ndviCV.toFixed(2)}). Пунктир — медиана и топ-25% района по культуре «{lead.crop}» (спутниковый слой).</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} /><YAxis domain={[0.3, 0.9]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area dataKey="band" stroke="none" fill={PAL[0]} fillOpacity={0.13} isAnimationActive={false} legendType="none" />
              <ReferenceLine y={reg.median} stroke="#1a1a1a" strokeDasharray="5 4" strokeWidth={1} label={{ value: `медиана района ${reg.median}`, position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' }} />
              <ReferenceLine y={reg.p75} stroke="#2b6def" strokeDasharray="5 4" strokeWidth={1} label={{ value: `топ-25% ${reg.p75}`, position: 'insideTopRight', fontSize: 10, fill: '#2b6def' }} />
              <Legend />
              {top.map((f, i) => <Line key={f.id} type="monotone" dataKey={f.name} stroke={PAL[i]} strokeWidth={2} dot={false} isAnimationActive={false} />)}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3 font-bold text-ink border-b border-line flex items-center justify-between">Аналитическая таблица вегетации<span className="text-xs font-normal text-muted">клик по полю → сезон в деталях</span></div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле</th><th className="text-left font-medium p-3">Культура</th>
            <th className="text-right font-medium p-3">NDVI сейчас</th>
            <th className="text-right font-medium p-3" title="Отклонение NDVI поля от медианы района по культуре (спутниковый слой)">Δ к региону</th>
            <th className="text-right font-medium p-3">
              <button onClick={() => setSortCV((v) => !v)} className={`inline-flex items-center gap-1 hover:text-ink ${sortCV ? 'text-brand font-semibold' : ''}`} title="Однородность = вариативность NDVI (CV = σ/mean)">
                Однородность (CV)<ArrowDownUp size={12} />
              </button>
            </th>
            <th className="text-left font-medium p-3">Тренд</th><th className="text-left font-medium p-3">Статус</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map((f) => {
              const cvS = cvStatus(f.ndviCV)
              const heterog = f.ndviCV >= NDVI_CV_THRESHOLD
              return (
                <tr key={f.id} onClick={() => setOpen(f)} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer">
                  <td className="p-3 font-semibold text-ink">{f.name}</td>
                  <td className="p-3"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[f.crop] }} />{f.crop}</span></td>
                  <td className="p-3 text-right font-bold" style={{ color: statusColor(f.status) }}>{f.ndvi.toFixed(2)}</td>
                  <td className="p-3 text-right">{(() => { const d = ndviVsRegion(f.ndvi, f.crop); const c = d >= 0 ? '#2da84f' : d >= -8 ? '#e0900a' : '#e5302a'; return <span className="font-semibold tabular-nums" style={{ color: c }}>{d >= 0 ? '+' : ''}{d}%</span> })()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {heterog && (
                        <button onClick={(e) => { e.stopPropagation(); go('agVRA') }} title="Высокая неоднородность — кандидат на дифференцированное внесение" className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand-soft rounded-full px-2 py-0.5 hover:brightness-95">
                          <Sparkles size={10} />дифвнесение
                        </button>
                      )}
                      <span className="font-bold tabular-nums" style={{ color: statusColor(cvS) }}>{f.ndviCV.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="inline-block h-1.5 rounded-full" style={{ width: `${f.ndvi * 90}px`, background: statusColor(f.status) }} />
                  </td>
                  <td className="p-3">{f.status === 'risk' ? <span className="text-risk text-xs font-semibold">отстаёт</span> : f.status === 'warn' ? <span className="text-warn text-xs font-semibold">внимание</span> : <span className="text-ok text-xs font-semibold">норма</span>}</td>
                  <td className="p-3 text-right"><ChevronRight size={16} className="text-muted" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
      {open && <Chronology field={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
