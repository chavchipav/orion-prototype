import { useState, type ReactNode } from 'react'
import { type AgField, statusColor, regionBenchmark } from '../agronomData'
import { fieldSeason, seasonField, type ProblemStatus } from '../agronomSeason'
import { epvDecision, rubShort } from '../epvData'
import { useAgro } from '../agroStore'
import { useApp, type ScreenKey } from '../store'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot, ReferenceArea, ReferenceLine } from 'recharts'
import { X, Tractor, ChevronRight, AlertTriangle, ShieldCheck, Wallet, Zap, Calendar, ArrowRight, Eye, Lightbulb, Scale } from 'lucide-react'

const YEARS = [2026, 2025, 2024]
const mln = (n: number) => (n / 1_000_000).toFixed(2) + ' млн ₽'

function probTone(s: ProblemStatus) {
  return s === 'закрыта' ? '#2da84f' : s === 'обработка' ? '#e0900a' : s === 'рецидив' ? '#e5302a' : '#e5302a'
}

export function Chronology({ field, onClose, initialYear = 2026 }: { field: AgField; onClose: () => void; initialYear?: number }) {
  const { issueForField, recommend, markWorkDone, reopen } = useAgro()
  const { go } = useApp()
  const nav = (sc: ScreenKey) => { go(sc); onClose() } // переход в раздел + закрыть кокпит
  // целевой раздел для операции (питание→Питание, защита→Работы, иначе→Техкарты)
  const opTarget = (block: string): ScreenKey => block === 'Питание' ? 'agNutrition' : block === 'Защита растений' ? 'agWorks' : 'agTechcards'
  // целевой раздел для риск-флага
  const flagTarget = (f: string): ScreenKey => f.startsWith('Открытая проблема') ? 'agScouting' : f.startsWith('Отставание') ? 'agWorks' : f.startsWith('Севооборот') ? 'agRotation' : 'agVegetation'
  const [year, setYear] = useState(initialYear)
  const pf = seasonField(field, year)
  const s = fieldSeason(pf, year)
  const reg = regionBenchmark(field.crop) // коридор района по культуре (спутниковый слой)
  const curStage = s.phases.find((p) => p.current)?.stage

  // для текущего сезона — накладываем актуальный статус из общего цикла (осмотры/рекомендации/работы)
  const issue = year === 2026 ? issueForField(field.id) : undefined
  const problems = issue && s.problems[0]
    ? [{ ...s.problems[0], status: issue.status, product: issue.rec.product, treatmentDate: issue.work?.date ?? s.problems[0].treatmentDate, effect: issue.effect }]
    : s.problems
  const atRisk = problems[0] ? problems[0].status === 'открыта' : !!s.economics?.atRisk
  // риск-флаги пересчитываем от наложенного статуса (а не от генератора)
  const riskFlags = (() => {
    const base = s.riskFlags.filter((f) => !f.startsWith('Открытая проблема'))
    const p = problems[0]
    return p && (p.status === 'открыта' || p.status === 'рецидив') ? [`Открытая проблема: ${p.name}`, ...base] : base
  })()

  // заголовок секции с переходом в соответствующий раздел (сквозная навигация)
  const SecHead = ({ children, to, label }: { children: ReactNode; to?: ScreenKey; label?: string }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="text-sm font-semibold text-ink">{children}</div>
      {to && <button onClick={() => nav(to)} className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1">{label}<ArrowRight size={12} /></button>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
          <div>
            <div className="font-bold text-ink">Сезон поля {field.name} · {s.crop}</div>
            <div className="text-xs text-muted">сорт «{s.sort}» · {field.areaHa} га · текущая фаза: <b className="text-ink">{curStage}</b></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-canvas rounded-lg p-0.5">
              {YEARS.map((y) => <button key={y} onClick={() => setYear(y)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${y === year ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{y}</button>)}
            </div>
            <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto scroll-thin">
          {year !== 2026 && <div className="mb-4 text-xs font-semibold text-sky bg-sky-soft inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"><Calendar size={12} />Память поля · завершённый сезон {year}</div>}

          {/* лента фенофаз */}
          <SecHead to="agCalendar" label="Календарь">Фенология сезона</SecHead>
          <div className="flex gap-1 overflow-x-auto scroll-thin pb-2 mb-4">
            {s.phases.map((p, i) => (
              <div key={i} className="flex items-center shrink-0">
                <div className={`flex flex-col items-center w-[92px] text-center ${p.current ? '' : 'opacity-90'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full grid place-items-center ${p.current ? 'ring-4 ring-brand/20 bg-brand' : p.done ? 'bg-ok' : 'bg-line'}`}>
                    {p.critical && <Zap size={9} className="text-white" />}
                  </div>
                  <div className={`text-[11px] mt-1 leading-tight ${p.current ? 'font-bold text-ink' : p.done ? 'text-ink' : 'text-muted'}`}>{p.stage}</div>
                  <div className="text-[10px] text-muted">{p.date}</div>
                </div>
                {i < s.phases.length - 1 && <div className={`h-0.5 w-3 ${p.done ? 'bg-ok' : 'bg-line'}`} />}
              </div>
            ))}
          </div>

          {/* NDVI */}
          <SecHead to="agVegetation" label="Вегетация">Динамика NDVI по фазам</SecHead>
          <div className="h-40 mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.ndviSeries} margin={{ left: -18, right: 8, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stage" tick={false} axisLine={{ stroke: '#e6e6e6' }} />
                <YAxis domain={[0.1, 0.95]} tick={{ fontSize: 11 }} />
                <Tooltip />
                {/* коридор района по культуре (спутниковый слой) */}
                {field.crop !== 'Пар' && <ReferenceArea y1={reg.p25} y2={reg.p75} fill="#2b6def" fillOpacity={0.08} stroke="none" />}
                {field.crop !== 'Пар' && <ReferenceLine y={reg.median} stroke="#2b6def" strokeDasharray="4 4" strokeWidth={1} />}
                <Line type="monotone" dataKey="ndvi" stroke={statusColor(pf.status)} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                {curStage && year === 2026 && <ReferenceDot x={curStage} y={s.ndviSeries.find((d) => d.stage === curStage)?.ndvi} r={5} fill="#fc3f1d" stroke="#fff" strokeWidth={1.5} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {field.crop !== 'Пар' && <div className="text-[10px] text-muted -mt-4 mb-4 flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-sky/20 border border-sky/40" />коридор района (p25–p75, медиана пунктиром) по культуре «{field.crop}» — спутниковый слой</div>}

          {/* жизненный цикл проблем */}
          {problems.length > 0 && (
            <>
              <SecHead to="agScouting" label="Осмотры">Проблемы и решения</SecHead>
              <div className="space-y-3 mb-5">
                {problems.map((p, i) => {
                  const steps: ProblemStatus[] = ['открыта', 'обработка', p.status === 'рецидив' ? 'рецидив' : 'закрыта']
                  const curStep = steps.indexOf(p.status)
                  return (
                    <div key={i} className="rounded-xl border border-line p-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} style={{ color: probTone(p.status) }} />
                          <span className="font-semibold text-ink">{p.name}</span>
                          <span className="text-xs text-muted">{p.kind} · фаза {p.phase} · развитие {p.dev}, охват {p.spread}%</span>
                        </div>
                        <span className="text-xs text-muted">с {p.openedDate}</span>
                      </div>
                      {/* stepper */}
                      <div className="flex items-center gap-1.5 mb-2">
                        {steps.map((st, j) => (
                          <div key={j} className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={j <= curStep ? { background: probTone(p.status) + '22', color: probTone(p.status) } : { background: '#f3f3f5', color: '#9a9a9a' }}>{st}</span>
                            {j < steps.length - 1 && <ChevronRight size={13} className={j < curStep ? 'text-ink' : 'text-line'} />}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-muted">Решение: <b className="text-ink">{p.product}</b>{p.treatmentDate && <> · обработка {p.treatmentDate}</>} · <span style={{ color: probTone(p.status) }}>{p.effect}</span></div>
                      {p.recSource && <div className="text-[11px] text-muted mt-1 italic">«{p.recSource}»</div>}
                      {/* сквозной цикл: переход в связанные разделы */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold text-brand">
                        <button onClick={() => nav('agScouting')} className="inline-flex items-center gap-1 hover:underline"><Eye size={12} />Осмотры</button>
                        <ChevronRight size={11} className="text-line" />
                        <button onClick={() => nav('agRecommendations')} className="inline-flex items-center gap-1 hover:underline"><Lightbulb size={12} />Рекомендации</button>
                        <ChevronRight size={11} className="text-line" />
                        <button onClick={() => nav('agWorks')} className="inline-flex items-center gap-1 hover:underline"><Tractor size={12} />Работы</button>
                      </div>
                      {year === 2026 && issue && (
                        <div className="mt-2.5">
                          {issue.status === 'открыта' && <button onClick={() => recommend(issue.id)} className="text-xs font-semibold text-white bg-brand px-3 py-1.5 rounded-lg">Принять рекомендацию → в работу</button>}
                          {issue.status === 'обработка' && <button onClick={() => markWorkDone(issue.id)} className="text-xs font-semibold text-white bg-ok px-3 py-1.5 rounded-lg">Отметить работу выполненной → закрыть</button>}
                          {issue.status === 'рецидив' && <button onClick={() => markWorkDone(issue.id)} className="text-xs font-semibold text-white bg-risk px-3 py-1.5 rounded-lg">Повторная обработка → закрыть</button>}
                          {issue.status === 'закрыта' && <button onClick={() => reopen(issue.id)} className="text-xs font-semibold text-ink bg-canvas px-3 py-1.5 rounded-lg">Открыть повторно (рецидив)</button>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* план vs факт операций */}
          <SecHead to="agTechcards" label="Техкарты">План / факт операций</SecHead>
          <div className="rounded-xl border border-line overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line bg-canvas/50"><th className="text-left font-medium p-2.5">Операция</th><th className="text-left font-medium p-2.5">Фаза</th><th className="text-right font-medium p-2.5">План</th><th className="text-right font-medium p-2.5">Факт</th><th className="text-left font-medium p-2.5">Статус</th></tr></thead>
              <tbody>
                {s.ops.map((o, i) => {
                  const late = (o.lagDays || 0) > 4
                  return (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="p-2.5"><div className="flex items-center gap-2"><Tractor size={13} className="text-muted" /><button onClick={() => nav(opTarget(o.block))} className="text-ink hover:text-brand hover:underline text-left">{o.name}</button></div>{o.products && o.products.length > 0 && <div className="text-[11px] text-muted ml-5">{o.products.map((pr) => `${pr.name} ${pr.norm} ${pr.unit}`).join(', ')}</div>}</td>
                      <td className="p-2.5 text-muted text-xs">{o.phase || o.block}</td>
                      <td className="p-2.5 text-right text-muted">{o.plannedDate}</td>
                      <td className="p-2.5 text-right font-semibold" style={{ color: o.actualDate ? (late ? '#e0900a' : '#2da84f') : '#bcbcc4' }}>{o.actualDate || '—'}</td>
                      <td className="p-2.5">{o.status === 'Факт' ? <span className="text-xs font-semibold text-ok">{late ? `факт +${o.lagDays} дн` : 'выполнено'}</span> : <span className="text-xs font-semibold text-muted">план</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* итог сезона + ROI */}
          <SecHead to="agAnalytics" label="Аналитика">Итог сезона</SecHead>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <button onClick={() => nav('agAnalytics')} className="rounded-xl bg-canvas p-3 text-left hover:bg-brand-soft/40 transition"><div className="text-xs text-muted">Урожай план</div><div className="text-lg font-extrabold text-ink">{s.yield.plan} {s.yield.unit}</div></button>
            <button onClick={() => nav('agAnalytics')} className="rounded-xl bg-canvas p-3 text-left hover:bg-brand-soft/40 transition"><div className="text-xs text-muted">Урожай {s.yield.harvested ? 'факт' : 'прогноз'}</div><div className="text-lg font-extrabold" style={{ color: s.yield.fact >= s.yield.plan ? '#2da84f' : '#e0900a' }}>{s.yield.fact} {s.yield.unit}</div></button>
            <button onClick={() => nav('agAnalytics')} className="rounded-xl bg-canvas p-3 text-left hover:bg-brand-soft/40 transition"><div className="text-xs text-muted">Откл. от плана</div><div className="text-lg font-extrabold text-ink">{s.yield.plan ? Math.round((s.yield.fact / s.yield.plan - 1) * 100) : 0}%</div></button>
          </div>

          {s.economics && (
            <button onClick={() => nav('agAnalytics')} className={`w-full text-left rounded-xl p-3.5 mb-3 flex items-start gap-3 hover:brightness-[0.97] transition ${atRisk ? 'bg-risk-soft/50' : 'bg-ok-soft/50'}`}>
              {atRisk ? <Wallet size={18} className="text-risk mt-0.5 shrink-0" /> : <ShieldCheck size={18} className="text-ok mt-0.5 shrink-0" />}
              <div className="text-sm flex-1">
                {atRisk
                  ? <><b className="text-ink">Под угрозой при бездействии: {mln(s.economics.fieldSaved)}</b> на поле — {s.economics.savedYield} т/га × {field.areaHa} га. Окно обработки закрывается.</>
                  : <><b className="text-ink">ROI защиты ×{s.economics.roi}</b>: спасено ≈ {mln(s.economics.fieldSaved)} ({s.economics.savedYield} т/га) при затратах {s.economics.costPerHa.toLocaleString('ru-RU')} ₽/га. Решение агронома окупилось.</>}
              </div>
              <ArrowRight size={15} className="text-muted mt-0.5 shrink-0" />
            </button>
          )}

          {atRisk && problems[0] && year === 2026 && (() => {
            const epv = epvDecision(problems[0].kind, field.crop, problems[0].spread, field.areaHa)
            return (
              <button onClick={() => nav('agScouting')} className="w-full text-left rounded-xl bg-canvas p-3 mb-3 flex items-center gap-2 hover:bg-brand-soft/30 transition">
                <Scale size={15} className={epv.exceeded ? 'text-risk shrink-0' : 'text-muted shrink-0'} />
                <div className="text-xs text-ink flex-1">ЭПВ {epv.exceeded ? <span className="text-risk font-bold">превышен</span> : 'ниже порога'}: факт {epv.fact} {epv.unit} при пороге {epv.threshold} {epv.unit} → потенциальная потеря <b>{epv.lossTPerHa} т/га · {rubShort(epv.lossRub)}</b> (расчёт в осмотре).</div>
                <ArrowRight size={13} className="text-muted shrink-0" />
              </button>
            )
          })()}

          {riskFlags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFlags.map((f, i) => <button key={i} onClick={() => nav(flagTarget(f))} className="inline-flex items-center gap-1 text-xs font-semibold text-risk bg-risk-soft px-2.5 py-1 rounded-full hover:bg-risk-soft/70 transition"><AlertTriangle size={11} />{f}<ArrowRight size={11} /></button>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
