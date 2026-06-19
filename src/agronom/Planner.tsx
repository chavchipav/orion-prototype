import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { buildPlan, FORECAST, spraySuitability, type PlanTask, type DayWx, type TimeBand } from '../agronomPlanner'
import { statusColor } from '../agronomData'
import { Moon, Sun, Sunrise, Wind, CloudRain, AlertTriangle, Tractor, ArrowRight, CalendarClock, Bot, Eye } from 'lucide-react'

const bandIcon = (b: TimeBand) => b === 'ночь' ? Moon : b === 'утро' ? Sunrise : Sun
const suitColor = (s: 0 | 1 | 2) => s === 2 ? '#2da84f' : s === 1 ? '#e0900a' : '#e5302a'
const suitLabel = (s: 0 | 1 | 2) => s === 2 ? 'днём' : s === 1 ? 'ночью' : 'нельзя'

export function Planner() {
  const { go } = useApp()
  const plan = useMemo(() => buildPlan(), [])
  const [status, setStatus] = useState<Record<string, PlanTask['status']>>({})

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2"><Bot size={20} className="text-brand" />Планировщик · Ассистент</h2>
          <p className="text-sm text-muted mt-1 max-w-2xl">Проактивные работы — <b>не из осмотров</b>, а по фенофазе + погоде. Движок считает окно (ветер, осадки, жара, инверсия, пчёлы) и подсказывает <b>когда</b> — заранее, чтобы успеть спланировать смену и технику.</p>
        </div>
        <button onClick={() => go('agWeather')} className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 shrink-0 mt-1">Погода<ArrowRight size={12} /></button>
      </div>

      {/* два потока работ */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <button onClick={() => go('agScouting')} className="inline-flex items-center gap-1.5 bg-canvas hover:bg-brand-soft/40 rounded-lg px-3 py-1.5 font-semibold text-ink"><Eye size={13} className="text-risk" />Реактивные — из осмотров (проблема → работа)<ArrowRight size={12} className="text-muted" /></button>
        <span className="inline-flex items-center gap-1.5 bg-brand-soft text-brand rounded-lg px-3 py-1.5 font-semibold"><CalendarClock size={13} />Проактивные — план + погода (этот экран)</span>
      </div>

      {/* полоска прогноза с пригодностью к опрыскиванию */}
      <div className="rounded-2xl bg-white border border-line p-3 mb-5">
        <div className="text-xs font-bold text-ink mb-2 px-1">Окно опрыскивания · прогноз 12 дней</div>
        <div className="flex gap-1 overflow-x-auto scroll-thin pb-1">
          {FORECAST.map((w: DayWx, i) => {
            const s = spraySuitability(w)
            return (
              <div key={i} className="shrink-0 w-[78px] rounded-xl border border-line p-2 text-center">
                <div className="text-[11px] text-muted">{w.dow} {w.date}</div>
                <div className="text-sm font-bold text-ink mt-0.5">{w.tMax}°<span className="text-[10px] text-muted font-normal">/{w.tMin}°</span></div>
                <div className="text-[10px] text-muted flex items-center justify-center gap-0.5"><Wind size={9} />{w.windDay} · <CloudRain size={9} />{w.rainMm}</div>
                <div className="mt-1.5 rounded-md text-[10px] font-bold py-0.5" style={{ background: suitColor(s) + '22', color: suitColor(s) }}>{suitLabel(s)}</div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 px-1 text-[10px] text-muted">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: '#2da84f' }} />можно днём</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: '#e0900a' }} />только ночью</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: '#e5302a' }} />нельзя (ветер/осадки)</span>
        </div>
      </div>

      {/* лента плановых работ */}
      <div className="text-sm font-semibold text-ink mb-2">Ближайшие работы · {plan.length}</div>
      <div className="space-y-2.5">
        {plan.map((t) => {
          const st = status[t.id] || t.status
          const w = t.window
          const BI = bandIcon(w.band)
          return (
            <div key={t.id} className="rounded-2xl bg-white border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink">{t.field.name}</span>
                    <span className="text-xs text-muted">{t.crop}{t.phase && <> · фаза {t.phase}</>}</span>
                    <span className="text-[11px] font-semibold bg-canvas text-muted px-2 py-0.5 rounded-full">{t.source}</span>
                  </div>
                  <div className="text-sm text-ink mt-1 flex items-center gap-1.5"><Tractor size={14} className="text-muted" /><b>{t.op}</b>{t.product && <span className="text-muted text-xs">· {t.product}</span>}</div>
                </div>
                <i className="w-2.5 h-2.5 rounded-full mt-2 shrink-0" style={{ background: statusColor(t.field.status) }} />
              </div>

              {/* рекомендованное окно */}
              {w.feasible ? (
                <div className={`mt-3 rounded-xl p-3 ${w.night ? 'bg-[#1b2540]/5' : 'bg-ok-soft/40'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink"><BI size={15} className={w.night ? 'text-sky' : 'text-warn'} />Окно: {w.dow} {w.date} · {w.band} {w.fromH}–{w.toH}</span>
                    <span className="text-xs text-muted">через {w.leadDays} дн</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.reasons.map((r, i) => <span key={i} className="text-[11px] font-semibold bg-white border border-line text-ink px-2 py-0.5 rounded-full">{r}</span>)}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-risk-soft/50 p-3 text-sm text-risk flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div>Нет погодного окна в ближайшие 12 дней. {w.blockers.slice(0, 3).map((b) => `${b.date}: ${b.why}`).join('; ')}.</div>
                </div>
              )}

              {/* блокеры (почему не раньше) */}
              {w.feasible && w.blockers.length > 0 && (
                <div className="text-[11px] text-muted mt-2">Раньше нельзя: {w.blockers.slice(0, 3).map((b) => `${b.date} — ${b.why}`).join('; ')}.</div>
              )}

              {/* исполнитель + статус */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <div className="text-xs text-muted">Исполнитель: <b className="text-ink">{t.assignee}</b></div>
                <select value={st} onChange={(e) => setStatus((s) => ({ ...s, [t.id]: e.target.value as PlanTask['status'] }))}
                  className={`text-xs font-semibold rounded-full px-2.5 py-1 ${st === 'выполнено' ? 'bg-ok-soft text-ok' : st === 'в работе' ? 'bg-warn-soft text-warn' : 'bg-canvas text-muted'}`}>
                  <option>запланировано</option><option>в работе</option><option>выполнено</option>
                </select>
              </div>
            </div>
          )
        })}
        {plan.length === 0 && <div className="text-sm text-muted">Плановых опрыскиваний в ближайшие дни нет.</div>}
      </div>
    </div>
  )
}
