import { useState, useMemo } from 'react'
import { AG_FIELDS, CROP_COLORS, type AgField } from '../agronomData'
import { fieldSeason, seasonField, TODAY } from '../agronomSeason'
import { Tractor, Sprout, AlertTriangle, ShieldCheck, CalendarDays, ChevronRight } from 'lucide-react'

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
type CalKind = 'фенофаза' | 'операция' | 'проблема' | 'обработка'
const KIND_COLOR: Record<CalKind, string> = { 'фенофаза': '#9aa5b1', 'операция': '#2b6def', 'проблема': '#e5302a', 'обработка': '#2da84f' }
const KIND_ICON: Record<CalKind, typeof Tractor> = { 'фенофаза': Sprout, 'операция': Tractor, 'проблема': AlertTriangle, 'обработка': ShieldCheck }
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

type CalEvent = { date: string; kind: CalKind; label: string; status: 'факт' | 'план' | 'инфо'; detail?: string }
const parseD = (s: string) => { const [d, m] = s.split('.').map(Number); return { d, m } }
const doy = (s: string) => { const { d, m } = parseD(s); return CUM[m - 1] + d }
const TODAY_DOY = doy(TODAY)

function buildEvents(field: AgField): CalEvent[] {
  const s = fieldSeason(seasonField(field, 2026), 2026)
  const ev: CalEvent[] = []
  s.phases.forEach((p) => ev.push({ date: p.date, kind: 'фенофаза', label: p.stage, status: p.done ? 'факт' : 'план' }))
  s.ops.forEach((o) => ev.push({ date: o.actualDate || o.plannedDate, kind: 'операция', label: o.name, status: o.status === 'Факт' ? 'факт' : 'план', detail: o.products?.map((pr) => `${pr.name} ${pr.norm} ${pr.unit}`).join(', ') }))
  s.problems.forEach((pr) => {
    ev.push({ date: pr.openedDate, kind: 'проблема', label: pr.name, status: 'инфо', detail: `${pr.dev}, охват ${pr.spread}%` })
    if (pr.treatmentDate && pr.status !== 'открыта') ev.push({ date: pr.treatmentDate, kind: 'обработка', label: `Обработка: ${pr.product}`, status: 'факт' })
  })
  return ev
}

export function Calendar() {
  const wheat = AG_FIELDS.find((f) => f.crop === 'Озимая пшеница') || AG_FIELDS[0]
  const [fieldId, setFieldId] = useState(wheat.id)
  const field = AG_FIELDS.find((f) => f.id === fieldId)!
  const events = useMemo(() => buildEvents(field), [fieldId]) // eslint-disable-line
  const [selDay, setSelDay] = useState<string | null>(null)

  const byDay: Record<string, CalEvent[]> = {}
  for (const e of events) (byDay[e.date] ||= []).push(e)

  // последовательность месяцев сезона (озимые — осень прошлого года)
  const monthsSet = [...new Set(events.map((e) => parseD(e.date).m))]
  const winter = monthsSet.some((m) => m >= 10) && monthsSet.some((m) => m <= 7)
  const yearFor = (m: number) => (winter && m >= 10 ? 2025 : 2026)
  const months = monthsSet.map((m) => ({ m, y: yearFor(m) })).sort((a, b) => a.y - b.y || a.m - b.m)

  // хронология с учётом года (озимые: осень = прошлый год), иначе doy путает осень/весну
  const chrono = (date: string) => yearFor(parseD(date).m) * 1000 + doy(date)
  const todayChrono = 2026 * 1000 + TODAY_DOY
  const isPast = (date: string) => chrono(date) < todayChrono
  for (const e of events) if (e.kind === 'фенофаза') e.status = isPast(e.date) ? 'факт' : 'план'

  const upcoming = events.filter((e) => !isPast(e.date) && e.kind !== 'проблема').sort((a, b) => chrono(a.date) - chrono(b.date)).slice(0, 6)
  const selEvents = selDay ? byDay[selDay] || [] : []

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><CalendarDays size={20} className="text-brand" />Календарь поля</h2>
          <p className="text-sm text-muted">Прошлые действия (факт) и плановые — по датам сезона. Сегодня — {TODAY}.2026.</p>
        </div>
        <select value={fieldId} onChange={(e) => { setFieldId(e.target.value); setSelDay(null) }} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
          {AG_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.crop}</option>)}
        </select>
      </div>

      {/* легенда */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted">
        {(Object.keys(KIND_COLOR) as CalKind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{k}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-brand bg-brand-soft" />сегодня</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full opacity-50 bg-ink" />план (бледный)</span>
      </div>

      <div className="flex gap-4">
        {/* месяцы */}
        <div className="flex-1 min-w-0 bg-white border border-line rounded-2xl p-4 overflow-x-auto scroll-thin">
          <div className="flex gap-5">
            {months.map(({ m, y }) => <MonthGrid key={`${y}-${m}`} y={y} m={m} byDay={byDay} onSel={setSelDay} selDay={selDay} />)}
          </div>
        </div>

        {/* боковая панель */}
        <aside className="w-72 shrink-0 space-y-4">
          {selDay ? (
            <div className="bg-white border border-line rounded-2xl p-4">
              <div className="font-bold text-ink mb-2">{selDay}.{months.find((x) => x.m === parseD(selDay).m)?.y} — события дня</div>
              <div className="space-y-2">
                {selEvents.map((e, i) => { const I = KIND_ICON[e.kind]; return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: KIND_COLOR[e.kind] }}><I size={14} /></span>
                    <div><div className="text-sm font-semibold text-ink">{e.label} <span className="text-[11px] font-normal text-muted">· {e.status}</span></div>{e.detail && <div className="text-xs text-muted">{e.detail}</div>}</div>
                  </div>
                ) })}
                {!selEvents.length && <div className="text-sm text-muted">Нет событий.</div>}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-line rounded-2xl p-4 text-sm text-muted">Кликните дату с плашкой — покажем события дня.</div>
          )}

          <div className="bg-white border border-line rounded-2xl p-4">
            <div className="font-bold text-ink mb-2 flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-brand" />Ближайшие плановые работы</div>
            <div className="space-y-1.5">
              {upcoming.map((e, i) => { const I = KIND_ICON[e.kind]; return (
                <button key={i} onClick={() => setSelDay(e.date)} className="w-full flex items-center gap-2 text-left hover:bg-canvas rounded-lg px-1.5 py-1">
                  <I size={13} style={{ color: KIND_COLOR[e.kind] }} />
                  <span className="text-sm text-ink flex-1 truncate">{e.label}</span>
                  <span className="text-xs text-muted">{e.date}</span>
                  <ChevronRight size={13} className="text-muted" />
                </button>
              ) })}
              {!upcoming.length && <div className="text-sm text-muted">Плановых работ нет — сезон завершается.</div>}
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-4">
            <div className="text-xs text-muted">Поле</div>
            <div className="font-bold text-ink flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[field.crop] }} />{field.name} · {field.crop}</div>
            <div className="text-xs text-muted mt-1">{field.areaHa} га · сорт {field.sort} · NDVI {field.ndvi.toFixed(2)}</div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function MonthGrid({ y, m, byDay, onSel, selDay }: { y: number; m: number; byDay: Record<string, CalEvent[]>; onSel: (d: string) => void; selDay: string | null }) {
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Пн-первый
  const days = m === 2 ? 28 : DAYS_IN[m - 1]
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  return (
    <div className="shrink-0 w-[224px]">
      <div className="text-sm font-bold text-ink mb-2">{MONTH_NAMES[m - 1]} {y}</div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted mb-1">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => <div key={i} className="text-center">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
          const evs = byDay[key] || []
          const isToday = key === TODAY && y === 2026
          const sel = selDay === key
          return (
            <button key={i} onClick={() => evs.length && onSel(key)} className={`aspect-square rounded-md border relative ${isToday ? 'border-brand bg-brand-soft' : sel ? 'border-ink' : 'border-line'} ${evs.length ? 'cursor-pointer hover:border-ink' : 'opacity-50 cursor-default'}`}>
              <span className="absolute top-0.5 left-1 text-[9px] text-muted">{d}</span>
              <div className="absolute bottom-0.5 left-0 right-0 flex flex-wrap gap-0.5 justify-center">
                {evs.slice(0, 4).map((e, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: KIND_COLOR[e.kind], opacity: e.status === 'план' ? 0.45 : 1 }} />)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
