import { useState, type ReactNode } from 'react'
import { AG_FIELDS, CROP_COLORS, type AgField } from '../agronomData'
import { fieldSeasonHistory, PRICE, type SeasonSummary } from '../agronomSeason'
import { rubShort } from '../epvData'
import { useAgro } from '../agroStore'
import { Chronology } from './Chronology'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, LabelList } from 'recharts'
import { Download, ArrowRight, ShieldCheck } from 'lucide-react'
import { downloadCsv } from '../csv'
import { CountUp } from '../components/Delight'

const YEARS = [2024, 2025, 2026]
const mln = (n: number) => (n / 1_000_000).toFixed(1) + ' млн ₽'

// память полей: история по сезонам для каждого поля (кроме совсем мелких)
const HIST = AG_FIELDS.map((f) => ({ f, h: fieldSeasonHistory(f) }))

// Waterfall экономики (G6): выручка → статьи расходов → прибыль.
// Структура затрат — демо-доли от выручки (правдоподобно для подсолнечника на богаре).
const COST_SHARE: [string, number][] = [['Семена', 0.08], ['СЗР', 0.12], ['Удобрения', 0.16], ['Топливо, работы', 0.19], ['Аренда, прочее', 0.13]]
function WaterfallEconomics({ revenue }: { revenue: number }) {
  let run = revenue
  const data: { name: string; base: number; value: number; kind: 'rev' | 'cost' | 'profit' }[] = [{ name: 'Выручка', base: 0, value: revenue, kind: 'rev' }]
  for (const [n, p] of COST_SHARE) { const c = revenue * p; run -= c; data.push({ name: n, base: run, value: c, kind: 'cost' }) }
  data.push({ name: 'Прибыль', base: 0, value: run, kind: 'profit' })
  const color = (k: string) => k === 'rev' ? '#2563eb' : k === 'profit' ? '#2da84f' : '#e0900a'
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5b5b62' }} interval={0} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}`} width={28} />
        <Tooltip formatter={(v) => mln(Number(v))} />
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={color(d.kind)} />)}
          <LabelList dataKey="value" position="top" formatter={(v) => (Number(v) / 1_000_000).toFixed(1)} style={{ fontSize: 10, fill: '#5b5b62' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Analytics() {
  const { issueForField } = useAgro()
  const [year, setYear] = useState(2026)
  const [open, setOpen] = useState<{ field: typeof AG_FIELDS[number]; year: number } | null>(null)

  // для сезона 2026 накладываем актуальный статус проблемы из общего цикла:
  // «спасено защитой»/ROI считаются только если проблема пролечена (не «открыта»)
  const sumFor = (f: AgField, h: SeasonSummary[], y: number): SeasonSummary => {
    const s = h.find((x) => x.year === y)!
    if (y !== 2026) return s
    const iss = issueForField(f.id)
    if (!iss) return s
    const treated = iss.status !== 'открыта'
    return { ...s, keyProblem: iss.problem.name, problemStatus: iss.status, fieldSaved: treated ? s.fieldSaved : 0, roi: treated ? s.roi : null }
  }

  // агрегаты по выбранному сезону
  const rows = HIST.map(({ f, h }) => ({ f, s: sumFor(f, h, year) }))
  const cropped = rows.filter((r) => r.s.crop !== 'Пар')
  const area = rows.reduce((a, r) => a + r.f.areaHa, 0)
  const gross = cropped.reduce((a, r) => a + r.s.yieldFact * r.f.areaHa, 0)
  const revenueRub = cropped.reduce((a, r) => a + r.s.yieldFact * r.f.areaHa * PRICE[r.s.crop], 0)
  const avgYield = cropped.length ? gross / cropped.reduce((a, r) => a + r.f.areaHa, 0) : 0
  const saved = rows.reduce((a, r) => a + r.s.fieldSaved, 0)

  // строгая таблица план/факт урожайности и вала по полям
  const forecast = year === 2026 // сезон не завершён → факт помечается прогнозом
  const pfRows = cropped.map(({ f, s }) => {
    const plan = s.yieldPlan, fact = s.yieldFact
    const dT = +(fact - plan).toFixed(2)
    const grossPlan = plan * f.areaHa, grossFact = fact * f.areaHa
    const dRub = (fact - plan) * f.areaHa * PRICE[s.crop]
    const ratio = plan > 0 ? fact / plan : 1
    const tone = ratio >= 1 ? '#2da84f' : ratio >= 0.9 ? '#e0900a' : '#e5302a'
    return { f, s, plan, fact, dT, grossPlan, grossFact, dRub, tone }
  })
  const totPlanGross = pfRows.reduce((a, r) => a + r.grossPlan, 0)
  const totFactGross = pfRows.reduce((a, r) => a + r.grossFact, 0)
  const totDeltaT = totFactGross - totPlanGross
  const totDeltaRub = pfRows.reduce((a, r) => a + r.dRub, 0)
  const totTone = totDeltaT >= 0 ? '#2da84f' : totDeltaT >= -totPlanGross * 0.05 ? '#e0900a' : '#e5302a'
  const signRub = (n: number) => (n >= 0 ? '+' : '−') + rubShort(Math.abs(n))

  // тренд по сезонам: средняя урожайность (взвеш.) + спасено защитой
  const trend = YEARS.map((y) => {
    let g = 0, ar = 0, sv = 0
    for (const { f, h } of HIST) {
      const s = sumFor(f, h, y)
      sv += s.fieldSaved
      if (s.crop !== 'Пар') { g += s.yieldFact * f.areaHa; ar += f.areaHa }
    }
    return { year: String(y), avgYield: Math.round((ar ? g / ar : 0) * 100) / 100, saved: Math.round(sv / 1_000_000 * 10) / 10 }
  })

  return (
    <div className="h-full overflow-y-auto scroll-thin p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-xl font-bold text-ink">Аналитика сезонов</h2><p className="text-sm text-muted">Итоги по сезонам · память полей · ROI агрономических решений</p></div>
        <div className="flex items-center gap-3">
          <div className="flex bg-canvas rounded-lg p-0.5">
            {YEARS.map((y) => <button key={y} onClick={() => setYear(y)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${y === year ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{y}</button>)}
          </div>
          <button onClick={() => downloadCsv(`план-факт_${year}`, ['Поле', 'Культура', 'Площадь, га', 'План, т/га', 'Факт, т/га', 'Δ, т/га', 'Вал план, т', 'Вал факт, т', 'Δ, ₽'], pfRows.map((r) => [r.f.name, r.s.crop, r.f.areaHa, r.plan, r.fact, r.dT, Math.round(r.grossPlan), Math.round(r.grossFact), Math.round(r.dRub)]))} className="flex items-center gap-1.5 bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-line"><Download size={15} />Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi v={<CountUp value={Math.round(area)} suffix=" га" />} l={`в сезоне ${year}`} />
        <Kpi v={<CountUp value={avgYield} decimals={1} suffix=" т/га" />} l="средняя урожайность" accent />
        <Kpi v={<CountUp value={Math.round(gross)} suffix=" т" />} l="валовой сбор" />
        <Kpi v={<CountUp value={saved / 1_000_000} decimals={1} suffix=" млн ₽" />} l="спасено защитой (ROI)" />
      </div>

      {/* тренд по сезонам */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="font-bold text-ink mb-3">Средняя урожайность по сезонам, т/га</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="year" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip />
                <Bar dataKey="avgYield" name="т/га" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {trend.map((t, i) => <Cell key={i} fill={t.year === String(year) ? '#fc3f1d' : '#cfd6d1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5">
          <div className="font-bold text-ink mb-3">Спасено защитой по сезонам, млн ₽</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="year" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
                <Bar dataKey="saved" name="млн ₽" fill="#2da84f" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* экономика хозяйства: выручка → расходы → прибыль (waterfall) */}
      <div className="bg-white border border-line rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-ink">Экономика хозяйства · сезон {year}, млн ₽</div>
          <div className="text-sm text-muted">прибыль ≈ <b className="text-ok">{mln(revenueRub * (1 - COST_SHARE.reduce((a, [, p]) => a + p, 0)))}</b></div>
        </div>
        <div className="text-xs text-muted mb-2">От валовой выручки последовательно вычитаются статьи затрат — остаётся прибыль. Доли затрат демонстрационные.</div>
        <WaterfallEconomics revenue={revenueRub} />
      </div>

      {/* строгая таблица план/факт урожайности и вала по полям */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3 font-bold text-ink border-b border-line flex items-center justify-between">
          <span>План / факт урожайности и вала · сезон {year}</span>
          {forecast && <span className="text-xs font-normal text-warn">факт = прогноз (сезон не завершён)</span>}
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле · культура</th>
            <th className="text-right font-medium p-3">План, т/га</th>
            <th className="text-right font-medium p-3">{forecast ? 'Прогноз' : 'Факт'}, т/га</th>
            <th className="text-right font-medium p-3">Δ, т/га</th>
            <th className="text-right font-medium p-3">Вал план, т</th>
            <th className="text-right font-medium p-3">Вал {forecast ? 'прогноз' : 'факт'}, т</th>
            <th className="text-right font-medium p-3">Δ, ₽</th>
          </tr></thead>
          <tbody>
            {pfRows.map(({ f, s, plan, fact, dT, grossPlan, grossFact, dRub, tone }) => (
              <tr key={f.id} onClick={() => setOpen({ field: f, year })} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer">
                <td className="p-3"><div className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CROP_COLORS[s.crop] }} /><span className="font-semibold text-ink">{f.name}</span></div><div className="text-xs text-muted pl-4">{s.crop}</div></td>
                <td className="p-3 text-right text-muted">{plan.toFixed(1)}</td>
                <td className="p-3 text-right font-semibold text-ink">{fact.toFixed(1)}{forecast && <span className="text-[10px] text-warn ml-1">прогноз</span>}</td>
                <td className="p-3 text-right font-bold" style={{ color: tone }}>{dT >= 0 ? '+' : ''}{dT.toFixed(1)}</td>
                <td className="p-3 text-right text-muted">{Math.round(grossPlan).toLocaleString('ru-RU')}</td>
                <td className="p-3 text-right text-ink">{Math.round(grossFact).toLocaleString('ru-RU')}</td>
                <td className="p-3 text-right font-semibold" style={{ color: tone }}>{signRub(dRub)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-canvas/50 font-bold">
              <td className="p-3 text-ink">Итого по хозяйству · {pfRows.length} полей</td>
              <td className="p-3"></td>
              <td className="p-3"></td>
              <td className="p-3 text-right" style={{ color: totTone }}>{totDeltaT >= 0 ? '+' : ''}{Math.round(totDeltaT).toLocaleString('ru-RU')} т</td>
              <td className="p-3 text-right text-muted">{Math.round(totPlanGross).toLocaleString('ru-RU')}</td>
              <td className="p-3 text-right text-ink">{Math.round(totFactGross).toLocaleString('ru-RU')}</td>
              <td className="p-3 text-right" style={{ color: totTone }}>{signRub(totDeltaRub)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {/* инсайт: проблема → решение → исход */}
      <div className="bg-white border border-line rounded-2xl p-5 mb-4 flex items-start gap-3">
        <ShieldCheck size={20} className="text-ok mt-0.5 shrink-0" />
        <div className="text-sm text-ink">
          <b>Память поля работает:</b> на ХБ07 в <b>2025</b> — очаг заразихи на подсолнечнике (потери ~0,4 т/га).
          Решение агронома: переход на Clearfield-гибрид «Сапфир-КЛ» + гербицидная система в <b>2026</b>.
          <span className="inline-flex items-center gap-1 mx-1 text-muted">заразиха-2025 <ArrowRight size={13} /> Clearfield-2026 <ArrowRight size={13} /> урожай восстановлен</span>
          — продукт хранит причину и эффект, а не только цифру урожая.
        </div>
      </div>

      {/* память полей по сезонам */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3 font-bold text-ink border-b border-line flex items-center justify-between">
          <span>Память полей · урожай и проблемы по сезонам</span>
          <span className="text-xs font-normal text-muted">клик по полю → сезон в деталях</span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле</th>
            {YEARS.map((y) => <th key={y} className={`text-left font-medium p-3 ${y === year ? 'text-ink' : ''}`}>{y}</th>)}
            <th className="text-left font-medium p-3">Проблема {year}</th>
            <th className="text-right font-medium p-3">ROI защиты {year}</th>
          </tr></thead>
          <tbody>
            {HIST.slice(0, 12).map(({ f, h }) => {
              const cur = sumFor(f, h, year)
              return (
                <tr key={f.id} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer" onClick={() => setOpen({ field: f, year })}>
                  <td className="p-3 font-semibold text-ink">{f.name}</td>
                  {h.map((s) => (
                    <td key={s.year} className={`p-3 ${s.year === year ? 'bg-canvas/60' : ''}`}>
                      <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CROP_COLORS[s.crop] }} /><span className="text-ink">{s.crop === 'Пар' ? 'пар' : `${s.yieldFact} т/га`}</span></span>
                    </td>
                  ))}
                  <td className="p-3 text-muted text-xs">{cur.keyProblem === '—' ? '—' : `${cur.keyProblem} (${cur.problemStatus})`}</td>
                  <td className="p-3 text-right">{cur.roi ? <span className="font-semibold text-ok">×{cur.roi}</span> : <span className="text-muted">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {open && <Chronology field={open.field} initialYear={open.year} onClose={() => setOpen(null)} />}
    </div>
  )
}
function Kpi({ v, l, accent }: { v: ReactNode; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
