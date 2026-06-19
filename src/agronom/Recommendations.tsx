import { useAgro, issueStatusColor, type IssueStatus } from '../agroStore'
import { CROP_COLORS } from '../agronomData'
import { Lightbulb, ChevronRight, Eye, Tractor, ArrowRight } from 'lucide-react'

const STEPS: IssueStatus[] = ['открыта', 'обработка', 'закрыта']

export function Recommendations() {
  const { issues, recommend, markWorkDone, reopen } = useAgro()
  const cnt = (s: IssueStatus) => issues.filter((i) => i.status === s).length

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center gap-2 mb-1"><Lightbulb size={20} className="text-brand" /><h2 className="text-xl font-bold text-ink">Рекомендации</h2></div>
      <p className="text-sm text-muted mb-4">Единый цикл проблемы: осмотр → рекомендация → работа → эффект. Решение здесь меняет статус во всех экранах.</p>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi v={String(cnt('открыта'))} l="открыто · ждут решения" accent />
        <Kpi v={String(cnt('обработка'))} l="в обработке" />
        <Kpi v={String(cnt('рецидив'))} l="рецидив" />
        <Kpi v={String(cnt('закрыта'))} l="закрыто (эффект)" />
      </div>

      <div className="space-y-3 max-w-4xl">
        {issues.map((r) => {
          const tone = issueStatusColor(r.status)
          const curStep = STEPS.indexOf(r.status === 'рецидив' ? 'обработка' : r.status)
          return (
            <div key={r.id} className="bg-white border border-line rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[r.crop] }} />
                  <span className="font-bold text-ink">{r.fieldName}</span>
                  <span className="text-sm text-muted">· {r.crop} · {r.problem.name}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tone + '22', color: tone }}>{r.status}</span>
              </div>

              {/* цепочка осмотр → рекомендация → работа */}
              <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted flex-wrap">
                <span className="inline-flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg"><Eye size={12} />Осмотр {r.openedDate} · {r.problem.dev}, охват {r.problem.spread}%</span>
                <ArrowRight size={12} />
                <span className="inline-flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg"><Lightbulb size={12} />{r.rec.product}</span>
                <ArrowRight size={12} />
                {r.work
                  ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: tone + '18', color: tone }}><Tractor size={12} />Работа {r.work.date} · {r.work.status}</span>
                  : <span className="inline-flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg text-muted/70"><Tractor size={12} />работа не создана</span>}
              </div>

              <p className="text-sm text-ink mt-2.5">{r.rec.text}</p>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted">Продукт: <b className="text-ink">{r.rec.product}</b> · агроном {r.rec.agronom} · <span style={{ color: tone }}>{r.effect}</span></span>
                <div className="flex items-center gap-2">
                  {/* мини-степпер */}
                  <div className="hidden md:flex items-center gap-1">
                    {STEPS.map((_, j) => <span key={j} className="w-2 h-2 rounded-full" style={{ background: j <= curStep ? tone : '#e3e3e6' }} />)}
                  </div>
                  {r.status === 'открыта' && <button onClick={() => recommend(r.id)} className="flex items-center gap-1 text-sm font-semibold text-brand">Принять и в работу <ChevronRight size={15} /></button>}
                  {r.status === 'обработка' && <button onClick={() => markWorkDone(r.id)} className="flex items-center gap-1 text-sm font-semibold text-ok">Отметить выполнено <ChevronRight size={15} /></button>}
                  {r.status === 'рецидив' && <button onClick={() => markWorkDone(r.id)} className="flex items-center gap-1 text-sm font-semibold text-risk">Повторная обработка <ChevronRight size={15} /></button>}
                  {r.status === 'закрыта' && <button onClick={() => reopen(r.id)} className="text-xs font-semibold text-muted hover:text-ink">Открыть повторно</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
