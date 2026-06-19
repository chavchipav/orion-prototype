import { useState, type ReactNode } from 'react'
import { CROP_COLORS } from '../agronomData'
import { useAgro, issueStatusColor, type IssueStatus } from '../agroStore'
import { epvDecision, rubShort } from '../epvData'
import { AlertTriangle, Plus, Camera, MapPin, Filter, ClipboardList, Lightbulb, Tractor, ArrowRight, ChevronRight, Scale } from 'lucide-react'

const TEMPLATES = [
  { name: 'Озимая пшеница · Колошение', crop: 'Озимая пшеница', params: [{ n: 'Густота стояния', t: 'число' }, { n: 'Фаза BBCH', t: 'выбор' }, { n: 'Болезни листа', t: 'справочник' }, { n: 'Засорённость, %', t: 'число' }] },
  { name: 'Подсолнечник · Бутонизация', crop: 'Подсолнечник', params: [{ n: 'Заразиха (балл)', t: 'число' }, { n: 'Высота растений, см', t: 'число' }, { n: 'Влагообеспеченность', t: 'выбор' }, { n: 'Вредители', t: 'справочник' }] },
  { name: 'Универсальный', crop: 'Все', params: [{ n: 'Состояние посева', t: 'выбор' }, { n: 'Проблема', t: 'справочник' }, { n: 'Фото', t: 'медиа' }, { n: 'Комментарий', t: 'текст' }] },
]
const STEPS: IssueStatus[] = ['открыта', 'обработка', 'закрыта']

export function Scouting() {
  const { issues } = useAgro()
  const [openId, setOpenId] = useState<string | null>(null)
  const [tpl, setTpl] = useState(false)
  const alarms = issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив').length

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Осмотры · агроскаутинг</h2>
          <p className="text-sm text-muted">Найденные проблемы и их статус в едином цикле: осмотр → рекомендация → работа → эффект</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTpl(true)} className="flex items-center gap-1.5 bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold"><ClipboardList size={16} />Шаблоны осмотров</button>
          <button className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus size={16} />Новый осмотр</button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl p-3 flex flex-wrap items-end gap-3 mb-4">
        <Sel label="Тип данных" val="Отмеченные проблемы" />
        <Sel label="Культура" val="Все культуры" />
        <Sel label="Статус" val="Все" />
        <Sel label="Период" val="01.04 – 29.07" />
        <button className="flex items-center gap-1.5 bg-ink text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Filter size={15} />Показать на карте</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi v={String(issues.length)} l="осмотров с проблемой" />
        <Kpi v={String(alarms)} l="требуют решения" accent />
        <Kpi v={String(issues.filter((i) => i.status === 'обработка').length)} l="в обработке" />
        <Kpi v={String(issues.filter((i) => i.status === 'закрыта').length)} l="закрыто" />
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле · культура</th>
            <th className="text-left font-medium p-3">Дата · фаза</th>
            <th className="text-left font-medium p-3">Проблема</th>
            <th className="text-left font-medium p-3">Развитие / распр.</th>
            <th className="text-left font-medium p-3">Статус цикла</th>
            <th className="text-left font-medium p-3"></th>
          </tr></thead>
          <tbody>
            {issues.map((iss) => {
              const tone = issueStatusColor(iss.status)
              const alarm = iss.status === 'открыта' || iss.status === 'рецидив'
              return (
                <tr key={iss.id} onClick={() => setOpenId(iss.id)} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer">
                  <td className="p-3"><div className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[iss.crop] }} /><span className="font-semibold text-ink">{iss.fieldName}</span></div><div className="text-xs text-muted">{iss.crop} · {iss.sort}</div></td>
                  <td className="p-3">{iss.openedDate}<div className="text-xs text-muted">{iss.problem.phase}</div></td>
                  <td className="p-3"><span className="font-medium text-ink">{iss.problem.name}</span><div className="text-xs text-muted">{iss.problem.kind}</div></td>
                  <td className="p-3">{iss.problem.dev} · {iss.problem.spread}%</td>
                  <td className="p-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tone + '22', color: tone }}>{iss.status}</span></td>
                  <td className="p-3">{alarm && <span className="inline-flex items-center gap-1 text-risk text-xs font-bold"><AlertTriangle size={13} />ТРЕВОГА</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openId && <IssueCard id={openId} onClose={() => setOpenId(null)} />}
      {tpl && <TemplatesModal onClose={() => setTpl(false)} />}
    </div>
  )
}

function IssueCard({ id, onClose }: { id: string; onClose: () => void }) {
  const { issues, recommend, markWorkDone, reopen } = useAgro()
  const iss = issues.find((x) => x.id === id)
  if (!iss) return null
  const tone = issueStatusColor(iss.status)
  const curStep = STEPS.indexOf(iss.status === 'рецидив' ? 'обработка' : iss.status)
  const epv = epvDecision(iss.problem.kind, iss.crop, iss.problem.spread, iss.areaHa)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#13241b] text-white px-5 py-3 flex items-center justify-between">
          <div className="font-bold">Осмотр {iss.fieldName} · {iss.crop}</div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: tone + '33', color: '#fff' }}>{iss.status}</span>
        </div>
        <div className="h-28 bg-canvas grid place-items-center text-muted text-sm border-b border-line"><MapPin size={18} className="mr-1" /> спутник поля · {iss.areaHa} га · {iss.sort}</div>
        <div className="p-5">
          {/* lifecycle stepper */}
          <div className="flex items-center gap-1.5 mb-3">
            {STEPS.map((st, j) => (
              <div key={j} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={j <= curStep ? { background: tone + '22', color: tone } : { background: '#f3f3f5', color: '#9a9a9a' }}>{iss.status === 'рецидив' && j === 2 ? 'рецидив' : st}</span>
                {j < STEPS.length - 1 && <ChevronRight size={13} className={j < curStep ? 'text-ink' : 'text-line'} />}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line p-3 mb-3">
            <div className="font-bold text-ink">{iss.problem.name} <span className="text-xs text-muted font-normal">· {iss.problem.kind} · фаза {iss.problem.phase}</span></div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div><span className="text-xs text-muted">Развитие</span><div className="font-semibold">{iss.problem.dev}</div></div>
              <div><span className="text-xs text-muted">Распространение</span><div className="font-semibold">{iss.problem.spread}%</div></div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-12 h-12 rounded-lg bg-canvas grid place-items-center text-muted"><Camera size={16} /></div>
              <input placeholder="Комментарий…" className="flex-1 px-3 py-2 rounded-lg bg-canvas text-sm outline-none" />
            </div>
          </div>

          {/* ЭПВ — экономический порог вредоносности + денежная оценка потери */}
          <div className={`rounded-xl border p-3 mb-3 ${epv.exceeded ? 'border-risk/40 bg-risk-soft/40' : 'border-line bg-canvas/50'}`}>
            <div className="flex items-center gap-1.5 font-bold text-ink text-sm mb-2"><Scale size={14} className={epv.exceeded ? 'text-risk' : 'text-muted'} />Порог вредоносности (ЭПВ)</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-xs text-muted">Порог</div><div className="font-semibold">{epv.threshold} {epv.unit}</div></div>
              <div><div className="text-xs text-muted">Факт</div><div className="font-semibold" style={{ color: epv.exceeded ? '#e5302a' : '#1b1b1b' }}>{epv.fact} {epv.unit}</div></div>
              <div><div className="text-xs text-muted">Вердикт</div><div className={`font-bold ${epv.exceeded ? 'text-risk' : 'text-ok'}`}>{epv.exceeded ? 'превышен' : 'ниже порога'}</div></div>
            </div>
            <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-sm">
              <span className="text-xs text-muted">Потенциальная потеря при бездействии</span>
              <span className="font-bold text-ink">{epv.lossTPerHa} т/га · <span className={epv.exceeded ? 'text-risk' : 'text-ink'}>{rubShort(epv.lossRub)}</span></span>
            </div>
            <div className="text-[10px] text-muted mt-1">{epv.note} · {epv.lossTotalT} т на {iss.areaHa} га. Та же цифра — «под угрозой» в сезон-кокпите (Динамика поля).</div>
          </div>

          {/* chain: рекомендация → работа → эффект */}
          <div className="space-y-1.5 text-sm mb-3">
            <Chain icon={<Lightbulb size={13} />} label="Рекомендация" v={`${iss.rec.product} — ${iss.rec.agronom}`} />
            <Chain icon={<Tractor size={13} />} label="Работа" v={iss.work ? `${iss.work.op} · ${iss.work.date} · ${iss.work.status}` : 'не создана'} tone={iss.work ? tone : undefined} />
            <Chain icon={<ArrowRight size={13} />} label="Эффект" v={iss.effect} tone={tone} />
          </div>

          {/* action */}
          {iss.status === 'открыта' && <button onClick={() => recommend(iss.id)} className={`w-full text-white rounded-xl py-2.5 text-sm font-semibold ${epv.exceeded ? 'bg-risk' : 'bg-brand'}`}>{epv.exceeded ? `ЭПВ превышен — принять рекомендацию (риск ${rubShort(epv.lossRub)})` : 'Принять рекомендацию → создать работу'}</button>}
          {iss.status === 'обработка' && <button onClick={() => markWorkDone(iss.id)} className="w-full bg-ok text-white rounded-xl py-2.5 text-sm font-semibold">Отметить работу выполненной → закрыть</button>}
          {iss.status === 'рецидив' && <button onClick={() => markWorkDone(iss.id)} className="w-full bg-risk text-white rounded-xl py-2.5 text-sm font-semibold">Повторная обработка → закрыть</button>}
          {iss.status === 'закрыта' && <button onClick={() => reopen(iss.id)} className="w-full bg-canvas text-ink rounded-xl py-2.5 text-sm font-semibold">Открыть повторно (рецидив)</button>}
        </div>
      </div>
    </div>
  )
}
function Chain({ icon, label, v, tone }: { icon: ReactNode; label: string; v: string; tone?: string }) {
  return <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-canvas grid place-items-center text-muted shrink-0">{icon}</span><span className="text-xs text-muted w-24 shrink-0">{label}</span><span className="font-medium" style={{ color: tone || '#1b1b1b' }}>{v}</span></div>
}

function TemplatesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line sticky top-0 bg-white">
          <div className="font-bold text-ink">Шаблоны осмотров</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-canvas grid place-items-center text-muted text-lg">✕</button>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted mb-4">Собственные параметры осмотров по культурам и фазам — для единообразного внесения и сравнимости результатов.</p>
          <div className="space-y-3">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="border border-line rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-ink">{t.name}</div>
                  <span className="text-xs text-muted">{t.crop}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.params.map((p) => (
                    <span key={p.n} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-canvas text-xs text-ink">{p.n} <span className="text-muted">· {p.t}</span></span>
                  ))}
                  <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-soft text-brand text-xs font-semibold"><Plus size={12} />Параметр</button>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus size={15} />Новый шаблон</button>
        </div>
      </div>
    </div>
  )
}

function Sel({ label, val }: { label: string; val: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-muted mb-1">{label}</span>
      <div className="px-3 py-2 rounded-xl bg-canvas text-sm text-ink border border-line min-w-40">{val}</div>
    </label>
  )
}
function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
