import { useState } from 'react'
import { useSeed } from '../../seedStore'
import { useCrm } from '../../crmStore'
import { useApp } from '../../store'
import { HYBRIDS, type LeadStage, dealValue, STAGE_PROB } from '../../seedData'
import { CHANNELS } from '../../crmData'
import { Card, SectionTitle, Icon, Stat, Pill, Btn, StatusChip } from '../../ui'
import { Tabs } from '../../components/Tabs'
import { Search, Flame, Phone, FlaskConical, TrendingUp, Check, Sprout, ArrowRight, AlertTriangle, Download } from 'lucide-react'
import { downloadCsv } from '../../csv'
import { CountUp } from '../../components/Delight'

const hName = (id: string) => HYBRIDS.find((h) => h.id === id)?.name ?? HYBRIDS[0].name
// нормализация исходного канала лида к таксономии CHANNELS
function chanKey(raw: string): string {
  const s = (raw || '').toLowerCase()
  if (/telegram|соцсет|инстаграм|vk|ютуб/.test(s)) return 'Соцсети'
  if (/демо|баттл|посев/.test(s)) return 'Демосеть'
  if (/выставк|югагро|день поля|поля/.test(s)) return 'Выставка'
  if (/директ|перформанс|реклам|контекст/.test(s)) return 'Перформанс'
  return 'Сарафан'
}
const money = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + ' млн ₽' : Math.round(n / 1000) + ' тыс ₽'
const mln = (n: number) => (n / 1_000_000).toFixed(1) + ' млн ₽'

export function Funnel() {
  const [tab, setTab] = useState('accounts')
  const { accounts } = useCrm()
  return (
    <div>
      <SectionTitle sub="База компаний (госреестр + профильные хозяйства) → демо-сравнение → привлечение и задачи → сделки в работе → каналы и бюджет.">
        Клиенты и сделки
      </SectionTitle>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'accounts', label: `Аккаунты · ${accounts.length}` },
        { key: 'cases', label: 'Кейсы' },
        { key: 'contacts', label: 'Контакты' },
        { key: 'funnel', label: 'Воронка' },
        { key: 'channels', label: 'Каналы' },
        { key: 'budget', label: 'Бюджет' },
      ]} />
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'cases' && <CasesTab />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'funnel' && <FunnelTab />}
      {tab === 'channels' && <ChannelsTab />}
      {tab === 'budget' && <BudgetTab />}
    </div>
  )
}

// ── Аккаунты: целевые подсолнечные хозяйства (+ прочие юрлица реестра) ──
function AccountsTab() {
  const { accounts, engaged, addContact, toDemo, toFunnel } = useCrm()
  const [q, setQ] = useState('')
  const [onlySun, setOnlySun] = useState(true)   // по умолчанию — только сеющие подсолнечник
  const [minArea, setMinArea] = useState(0)
  const [zone, setZone] = useState('все')
  const [hot, setHot] = useState(false)

  const zones = [...new Set(accounts.map((a) => a.zone))]
  const list = accounts.filter((a) =>
    (!onlySun || a.growsSunflower) &&
    (a.areaHa >= minArea) &&
    (zone === 'все' || a.zone === zone) &&
    (!hot || a.stress !== 'ok') &&
    (!q || a.short.toLowerCase().includes(q.toLowerCase()) || (a.inn || '').includes(q)))

  const sun = accounts.filter((a) => a.growsSunflower).length
  const hotN = accounts.filter((a) => a.growsSunflower && a.stress !== 'ok').length

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card><Stat value={<CountUp value={sun} />} label="хозяйств сеют подсолнечник" /></Card>
        <Card><Stat value={<CountUp value={accounts.length} />} label="всего в базе (вкл. реестр)" /></Card>
        <Card><Stat value={<CountUp value={engaged.size} />} label="в работе" accent /></Card>
        <Card><Stat value={<CountUp value={hotN} />} label="подсолнечник в стресс-зоне" /></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="поиск по названию / ИНН" className="pl-8 pr-3 py-2 rounded-xl bg-white border border-line text-sm w-56" />
        </div>
        <button onClick={() => setOnlySun((v) => !v)} className={`px-3 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5 ${onlySun ? 'bg-ok text-white border-ok' : 'bg-white text-ink border-line'}`}><Sprout size={14} />Сеет подсолнечник</button>
        <select value={minArea} onChange={(e) => setMinArea(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
          <option value={0}>Любая площадь</option><option value={1000}>&gt; 1000 га</option><option value={3000}>&gt; 3000 га</option><option value={5000}>&gt; 5000 га</option>
        </select>
        <select value={zone} onChange={(e) => setZone(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
          <option value="все">Все зоны</option>{zones.map((z) => <option key={z}>{z}</option>)}
        </select>
        <button onClick={() => setHot((v) => !v)} className={`px-3 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5 ${hot ? 'bg-risk text-white border-risk' : 'bg-white text-ink border-line'}`}><Flame size={14} />В стрессе</button>
        <button onClick={() => downloadCsv('CRM_аккаунты', ['Компания', 'ИНН', 'Согласие на шеринг', 'Профиль', 'Площадь, га', 'Источник площади', 'Зона', 'Стресс', 'Дистрибьютор', 'Подбор', 'Потенциал, ₽'], list.map((a) => [a.short, a.inn || '', a.consent.yield ? 'да' : 'нет', a.profile, a.areaHa, a.areaSource, a.zone, a.stress, a.distributor || 'прямой', hName(a.fitHybridId), Math.round(dealValue(hName(a.fitHybridId), Math.round(a.areaHa * 0.4)))]))} className="px-3 py-2 rounded-xl text-sm font-semibold border bg-white text-ink border-line inline-flex items-center gap-1.5 hover:bg-canvas"><Download size={14} />Экспорт</button>
        <span className="text-xs text-muted ml-auto">показано {list.length}</span>
      </div>
      <p className="text-[11px] text-muted mb-3">Источник площади помечен честно: «заявка хозяйства» / «оценка по NDVI» / «реестр (груб. оценка)». Реестр госкомпаний — это юрлица, не подсолнечные хозяйства (фильтр «Сеет подсолнечник» их скрывает).</p>

      <Card pad={false} className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Компания · согласие</th>
            <th className="text-left font-medium p-3">Культура · площадь (источник)</th>
            <th className="text-left font-medium p-3">Зона · стресс</th>
            <th className="text-left font-medium p-3">Дистрибьютор</th>
            <th className="text-left font-medium p-3">Подбор</th>
            <th className="text-right font-medium p-3">Потенциал</th>
            <th className="text-left font-medium p-3">Действия</th>
          </tr></thead>
          <tbody>
            {list.slice(0, 40).map((a) => {
              const potential = dealValue(hName(a.fitHybridId), Math.round(a.areaHa * 0.4))
              const on = engaged.has(a.id)
              return (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas/60 align-top">
                  <td className="p-3">
                    <div className="font-semibold text-ink flex items-center gap-1.5">{a.short}
                      {a.source === 'реестр' ? <Pill tone="gray">реестр</Pill> : <Pill tone="ok">хозяйство</Pill>}</div>
                    <div className="text-[11px] text-muted">{a.inn ? `ИНН ${a.inn} · ` : ''}
                      {a.consent.yield
                        ? <span className="text-ok font-semibold">шарит данные ✓</span>
                        : <span className="text-warn">нет согласия на шеринг</span>}</div>
                  </td>
                  <td className="p-3 text-muted text-xs"><span className="text-ink">{a.profile}</span> · {a.areaHa.toLocaleString('ru-RU')} га<div className="text-[10px] opacity-80">источник: {a.areaSource}</div></td>
                  <td className="p-3"><div className="text-xs text-ink">{a.zone}</div><StatusChip s={a.stress} /></td>
                  <td className="p-3 text-xs">{a.distributor ? <span className="text-ink">{a.distributor.split(' ')[0]} <span className="text-muted">(канал)</span></span> : <span className="text-muted">— прямой</span>}</td>
                  <td className="p-3 text-ink text-xs">{hName(a.fitHybridId)}<div className="text-[10px] text-muted">{a.channel}</div></td>
                  <td className="p-3 text-right font-semibold">{mln(potential)}</td>
                  <td className="p-3">
                    {on ? <span className="inline-flex items-center gap-1 text-xs text-ok font-semibold"><Check size={13} />в работе</span> : (
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => addContact(a)} className="text-xs font-semibold text-ink bg-canvas rounded-lg px-2 py-1 hover:bg-line">В проработку</button>
                        <button onClick={() => toDemo(a)} className="text-xs font-semibold text-white bg-brand rounded-lg px-2 py-1 inline-flex items-center gap-1"><FlaskConical size={12} />Завести демо</button>
                        <button onClick={() => toFunnel(a)} className="text-xs font-semibold text-brand bg-brand-soft rounded-lg px-2 py-1">В переговоры</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      {list.length > 40 && <p className="text-xs text-muted mt-2">Показаны первые 40 из {list.length}. Уточните фильтр.</p>}
    </div>
  )
}

// ── Кейсы (компания → Баттл/оффер) ──
function CasesTab() {
  const { cases, accounts, setCaseStatus } = useCrm()
  const { go } = useApp()
  const acc = (id: string) => accounts.find((a) => a.id === id)
  const STATUSES: Case2[] = ['черновик', 'в Баттле', 'оффер', 'выигран', 'проигран']
  type Case2 = 'черновик' | 'в Баттле' | 'оффер' | 'выигран' | 'проигран'
  const tone = (s: string) => s === 'выигран' ? 'ok' : s === 'проигран' ? 'gray' : s === 'оффер' ? 'sky' : 'brand'
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted">Кейс — компания в «Баттле»: ставим свой гибрид рядом с конкурентом и несём результат как доказательство.</p>
        <Btn size="sm" variant="soft" onClick={() => go('seedDemo')}>Открыть «Баттл»</Btn>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cases.map((c) => {
          const a = acc(c.accountId)
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-ink">{a?.short ?? c.accountId}</div>
                  <div className="text-xs text-muted">{hName(c.hybridId)} · {a?.zone}</div>
                </div>
                <div className="text-right">
                  <Pill tone={tone(c.status) as 'ok' | 'gray' | 'sky' | 'brand'}>{c.status}</Pill>
                  <div className="text-sm font-bold text-ink mt-1">{mln(c.amountRub)}</div>
                </div>
              </div>
              {/* вероятность + взвешенный прогноз */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${Math.round(c.prob * 100)}%` }} /></div>
                <span className="text-[11px] text-muted shrink-0">{Math.round(c.prob * 100)}% · прогноз {mln(c.amountRub * c.prob)}</span>
              </div>
              {/* следующий шаг + блокер */}
              <div className="mt-2 rounded-lg bg-canvas p-2 text-xs">
                <div className="flex items-start gap-1.5"><ArrowRight size={12} className="text-brand mt-0.5 shrink-0" /><span className="text-ink"><b>След. шаг:</b> {c.nextStep}</span></div>
                {c.blocker && <div className="flex items-start gap-1.5 mt-1"><AlertTriangle size={12} className="text-warn mt-0.5 shrink-0" /><span className="text-muted"><b className="text-warn">Блокер:</b> {c.blocker}</span></div>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <select value={c.status} onChange={(e) => setCaseStatus(c.id, e.target.value as Case2)} className="text-xs font-semibold rounded-lg border border-line px-2 py-1 bg-white">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => go('seedDossier')} className="text-xs font-semibold text-brand">Досье →</button>
              </div>
            </Card>
          )
        })}
        {!cases.length && <div className="text-sm text-muted py-6">Кейсов пока нет. Заведите из вкладки «Аккаунты» → «В Баттл».</div>}
      </div>
    </div>
  )
}

// ── Контакты и задачи привлечения ──
const CSTAT: Record<string, string> = { 'встреча': 'bg-ok-soft text-ok', 'дозвон': 'bg-sky-soft text-sky', 'тишина': 'bg-brand-soft text-brand', 'новый': 'bg-canvas text-muted' }
function ContactsTab() {
  const { contacts, tasks, accounts, setContactStatus, setTaskStatus, addSalesTask } = useCrm()
  const acc = (id: string) => accounts.find((a) => a.id === id)
  return (
    <div className="grid grid-cols-2 gap-5">
      <div>
        <div className="font-bold text-ink mb-3">Контакты · кому когда вернуться</div>
        <div className="space-y-2">
          {contacts.map((c) => {
            const a = acc(c.accountId)
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-ink text-sm flex items-center gap-1.5"><Phone size={13} className="text-brand" />{c.name} <span className="text-muted font-normal">· {c.role}</span></div>
                    <div className="text-xs text-muted">{a?.short} · {c.phone}</div>
                  </div>
                  <select value={c.status} onChange={(e) => setContactStatus(c.id, e.target.value as typeof c.status)} className={`text-[11px] font-semibold rounded-full px-2 py-1 border-0 ${CSTAT[c.status]}`}>
                    <option value="новый">новый</option><option value="дозвон">дозвон</option><option value="встреча">встреча</option><option value="тишина">тишина</option>
                  </select>
                </div>
                <div className="text-xs text-ink mt-2 flex items-center justify-between"><span>{c.nextAction}</span><span className="text-muted">до {c.due}</span></div>
              </Card>
            )
          })}
          {!contacts.length && <div className="text-sm text-muted py-4">Контактов нет — заведите из «Аккаунты» → «В работу».</div>}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-ink">Задачи продажникам</div>
          <Btn size="sm" variant="ghost" onClick={() => addSalesTask(accounts[0].id, 'Холодный звонок по кейсу', '—', 'Менеджер Олег')}>+ задача</Btn>
        </div>
        <div className="space-y-2">
          {tasks.map((t) => {
            const a = acc(t.accountId)
            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm text-ink">{t.text}</div>
                  <select value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value as typeof t.status)} className={`text-[11px] font-semibold rounded-full px-2 py-1 shrink-0 ${t.status === 'закрыта' ? 'bg-ok-soft text-ok' : t.status === 'в работе' ? 'bg-warn-soft text-warn' : 'bg-canvas text-muted'}`}>
                    <option>новая</option><option>в работе</option><option>закрыта</option>
                  </select>
                </div>
                <div className="text-xs text-muted mt-1">{a?.short} · {t.owner} · до {t.due}</div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Воронка (лид → демо → контракт) ──
const STAGES: { key: LeadStage; label: string; sub: string }[] = [
  { key: 'лид', label: 'Лиды', sub: 'интерес, ещё не сеяли' },
  { key: 'демо', label: 'Демопосев', sub: 'сорт в поле, сравнение' },
  { key: 'контракт', label: 'Контракт', sub: 'подписан, в производстве' },
]
const next: Record<LeadStage, LeadStage | null> = { 'лид': 'демо', 'демо': 'контракт', 'контракт': null }
const prev: Record<LeadStage, LeadStage | null> = { 'лид': null, 'демо': 'лид', 'контракт': 'демо' }

function FunnelTab() {
  const { leads, moveLead } = useSeed()
  const conv = leads.length ? Math.round((leads.filter((l) => l.stage === 'контракт').length / leads.length) * 100) : 0
  const pipeline = leads.reduce((s, l) => s + dealValue(l.hybrid, l.areaHa), 0)
  const forecast = leads.reduce((s, l) => s + dealValue(l.hybrid, l.areaHa) * STAGE_PROB[l.stage], 0)
  const stageSum = (st: LeadStage) => leads.filter((l) => l.stage === st).reduce((s, l) => s + dealValue(l.hybrid, l.areaHa), 0)
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Card><Stat value={<CountUp value={leads.length} />} label="сделок в работе" /></Card>
        <Card><Stat value={<CountUp value={pipeline / 1_000_000} decimals={1} suffix=" млн ₽" />} label="сумма воронки (потолок)" /></Card>
        <Card><Stat value={<CountUp value={forecast / 1_000_000} decimals={1} suffix=" млн ₽" />} label="взвешенный прогноз сезона" accent /></Card>
        <Card><Stat value={<CountUp value={conv} suffix="%" />} label="конверсия лид → контракт" /></Card>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {STAGES.map((st) => {
          const items = leads.filter((l) => l.stage === st.key)
          return (
            <div key={st.key} className="bg-white rounded-2xl border border-line p-3">
              <div className="flex items-start justify-between px-1 mb-3">
                <div><span className="font-bold text-ink">{st.label}</span><div className="text-[11px] text-muted">{st.sub}</div></div>
                <div className="text-right"><div className="text-sm font-bold text-ink">{items.length}</div><div className="text-[11px] text-muted">{mln(stageSum(st.key))}</div></div>
              </div>
              <div className="space-y-2 max-h-[440px] overflow-y-auto scroll-thin">
                {items.map((l) => (
                  <div key={l.id} className="rounded-xl border border-line p-3 bg-canvas/40">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-ink text-sm">{l.farm}</div>
                      <div className="text-xs font-bold text-ink">{mln(dealValue(l.hybrid, l.areaHa))}</div>
                    </div>
                    <div className="text-xs text-muted mt-0.5">{l.hybrid} · {l.zone} · {l.areaHa} га</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-soft text-sky">{Math.round(STAGE_PROB[l.stage] * 100)}%</span>
                      <span className="text-[11px] text-muted truncate">{l.channel}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
                      <button disabled={!prev[l.stage]} onClick={() => prev[l.stage] && moveLead(l.id, prev[l.stage]!)} className="text-muted disabled:opacity-30 hover:text-ink"><Icon name="ChevronRight" size={16} className="rotate-180" /></button>
                      {next[l.stage] && <button onClick={() => moveLead(l.id, next[l.stage]!)} className="text-xs font-semibold text-brand">в «{next[l.stage]}» →</button>}
                    </div>
                  </div>
                ))}
                {!items.length && <div className="text-xs text-muted text-center py-6">пусто</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Каналы (источники + конверсия) ──
function ChannelsTab() {
  const { leads } = useSeed()
  const stat = CHANNELS.map((ch) => {
    const ls = leads.filter((l) => chanKey(l.channel) === ch.key)
    const won = ls.filter((l) => l.stage === 'контракт').length
    const pipeline = ls.reduce((s, l) => s + dealValue(l.hybrid, l.areaHa), 0)
    return { ...ch, n: ls.length, won, conv: ls.length ? Math.round((won / ls.length) * 100) : 0, pipeline }
  })
  const maxN = Math.max(1, ...stat.map((s) => s.n))
  return (
    <Card pad={false} className="overflow-hidden">
      <div className="p-4 font-bold text-ink">Каналы привлечения · конверсия лид → контракт</div>
      <table className="w-full text-sm">
        <thead><tr className="text-muted text-xs border-b border-line">
          <th className="text-left font-medium p-3">Канал</th><th className="text-left font-medium p-3 w-1/3">Лиды</th>
          <th className="text-right font-medium p-3">Контракты</th><th className="text-right font-medium p-3">Конверсия</th><th className="text-right font-medium p-3">Воронка ₽</th>
        </tr></thead>
        <tbody>
          {stat.map((s) => (
            <tr key={s.key} className="border-b border-line last:border-0">
              <td className="p-3"><div className="font-semibold text-ink">{s.label}</div><div className="text-[11px] text-muted">{s.hint}</div></td>
              <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${(s.n / maxN) * 100}%` }} /></div><span className="text-xs text-muted w-6">{s.n}</span></div></td>
              <td className="p-3 text-right">{s.won}</td>
              <td className="p-3 text-right font-semibold" style={{ color: s.conv >= 30 ? '#2da84f' : '#1b1b1b' }}>{s.conv}%</td>
              <td className="p-3 text-right text-ink">{mln(s.pipeline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

// ── Бюджет привлечения (CAC) ──
function BudgetTab() {
  const { budget, setBudget } = useCrm()
  const { leads } = useSeed()
  const leadsBy = (ch: string) => leads.filter((l) => chanKey(l.channel) === ch).length
  const totalPlan = budget.reduce((s, b) => s + b.planRub, 0)
  const totalSpent = budget.reduce((s, b) => s + b.spentRub, 0)
  const totalLeads = budget.reduce((s, b) => s + leadsBy(b.channel), 0)
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card><Stat value={money(totalPlan)} label="план привлечения" /></Card>
        <Card><Stat value={money(totalSpent)} label="израсходовано" /></Card>
        <Card><Stat value={totalLeads} label="лидов привлечено" /></Card>
        <Card><Stat value={totalLeads ? money(Math.round(totalSpent / totalLeads)) : '—'} label="средний CAC / лид" accent /></Card>
      </div>
      <Card pad={false} className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Канал</th><th className="text-right font-medium p-3">План, ₽</th><th className="text-right font-medium p-3">Факт, ₽</th>
            <th className="text-right font-medium p-3">Лиды</th><th className="text-right font-medium p-3">CAC / лид</th><th className="text-left font-medium p-3 w-1/4">Освоение</th>
          </tr></thead>
          <tbody>
            {budget.map((b) => {
              const n = leadsBy(b.channel)
              const cac = n ? Math.round(b.spentRub / n) : 0
              const pct = b.planRub ? Math.min(Math.round((b.spentRub / b.planRub) * 100), 100) : 0
              return (
                <tr key={b.channel} className="border-b border-line last:border-0">
                  <td className="p-3 font-semibold text-ink">{b.channel}</td>
                  <td className="p-3 text-right"><input value={b.planRub} onChange={(e) => setBudget(b.channel, 'planRub', parseInt(e.target.value) || 0)} className="w-24 text-right px-2 py-1 rounded-lg border border-line text-sm" /></td>
                  <td className="p-3 text-right"><input value={b.spentRub} onChange={(e) => setBudget(b.channel, 'spentRub', parseInt(e.target.value) || 0)} className="w-24 text-right px-2 py-1 rounded-lg border border-line text-sm" /></td>
                  <td className="p-3 text-right text-muted">{n}</td>
                  <td className="p-3 text-right font-semibold">{n ? money(cac) : '—'}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} /></div><span className="text-xs text-muted w-9 text-right">{pct}%</span></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <div className="rounded-2xl border border-sky/30 bg-sky-soft/30 p-4 mt-4 flex items-center gap-3 text-sm text-ink">
        <TrendingUp size={18} className="text-sky shrink-0" />
        Сарафан и демосеть — самые дешёвые каналы (низкий CAC), перформанс/выставки дают объём. Бюджет редактируется — CAC пересчитывается по фактическим лидам воронки.
      </div>
    </div>
  )
}
