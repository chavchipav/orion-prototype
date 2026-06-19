import { useState } from 'react'
import { HYBRIDS, type Hybrid } from '../../seedData'
import { zoneStats, portfolioMatrix, strengthColor, repSummary, REP_MIN, fieldRecords, reliableMedian, backtest, type ZoneStat } from '../../seedRndData'
import { Card, SectionTitle, Pill } from '../../ui'
import { Modal } from '../../components/Modal'
import { AlertTriangle, ShieldCheck, Satellite, CloudSun, Droplets, ChevronRight, Target } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'

// «N слово» с русским склонением (1 зоне · 2 зонах · 5 зонах)
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
  return `${n} ${w}`
}

export function RnD() {
  const [hid, setHid] = useState('gelios310') // самый доказанный портфельный гибрид по умолчанию
  const h: Hybrid = HYBRIDS.find((x) => x.id === hid) ?? HYBRIDS[0]
  const stats = zoneStats(h.name)
  const rep = repSummary(h.name)
  const [drill, setDrill] = useState<{ hybrid: string; zone: string } | null>(null)

  return (
    <div>
      <SectionTitle sub="Как мой гибрид ведёт себя на реальных полях по климатзонам: средняя/разброс, засуха vs норма, бенчмарк против района и сколько полей за этим стоит. Доказательная база под продажу.">
        Поведение семян по регионам
      </SectionTitle>

      {/* выбор гибрида */}
      <div className="flex flex-wrap gap-2 mb-4">
        {HYBRIDS.map((x) => (
          <button key={x.id} onClick={() => setHid(x.id)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${x.id === hid ? 'bg-brand text-white border-brand' : 'bg-white text-ink border-line hover:bg-canvas'}`}>{x.name}</button>
        ))}
      </div>

      {/* репрезентативность */}
      <div className={`rounded-2xl border p-3.5 mb-4 flex items-center gap-3 ${rep.weakZones.length ? 'border-warn/30 bg-warn-soft/40' : 'border-ok/30 bg-ok-soft/40'}`}>
        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${rep.weakZones.length ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>
          {rep.weakZones.length ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
        </span>
        <div className="text-sm text-ink flex-1">
          <b>{h.name}</b>: данные с <b>{rep.totalN.toLocaleString('ru-RU')} полей</b> в {plural(rep.zonesWithData, 'зоне', 'зонах', 'зонах')}.
          {rep.weakZones.length
            ? <> Мало данных для доказательства в зонах: <b>{rep.weakZones.join(', ')}</b> (&lt;{REP_MIN} полей) — там вывод гипотеза, не факт.</>
            : <> Выборка достаточна, чтобы нести цифру клиенту как доказательство, а не «на слово».</>}
        </div>
      </div>

      {/* профиль по зонам */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {stats.map((s) => <ZoneCard key={s.zone} s={s} drought={h.drought} onDrill={() => setDrill({ hybrid: h.name, zone: s.zone })} />)}
      </div>

      {/* карта силы: гибрид × зона */}
      <Matrix highlight={h.name} onDrill={(hybrid, zone) => setDrill({ hybrid, zone })} />

      {/* валидация прогноз vs факт (U6) */}
      <Backtest />

      {/* drill-down в первичку (U4) */}
      {drill && <DrillModal hybrid={drill.hybrid} zone={drill.zone} onClose={() => setDrill(null)} />}
    </div>
  )
}

const METHOD_TONE: Record<string, string> = { 'бункерный вес': 'text-ok', 'обмолот (элеватор)': 'text-ok', 'оценка агронома': 'text-warn' }
function DrillModal({ hybrid, zone, onClose }: { hybrid: string; zone: string; onClose: () => void }) {
  const recs = fieldRecords(hybrid, zone)
  const rel = reliableMedian(recs)
  return (
    <Modal open title={`${hybrid} · ${zone} · первичка по полям`} onClose={onClose}>
      <div className="text-xs text-muted mb-2">
        Каждое поле — с указанием метода замера и контрольного поля-конкурента рядом. «Надёжная» медиана считается
        только по полям с бункерным весом/обмолотом И контролем — это то, что можно нести в продажу как факт.
      </div>
      <div className="rounded-xl bg-canvas p-2.5 mb-3 flex items-center gap-3 text-sm">
        <Target size={16} className="text-brand" />
        {rel.value != null
          ? <span>Надёжная медиана: <b className="text-ink">{rel.value} т/га</b> <span className="text-muted">(по {rel.n} надёжным полям из {recs.length})</span></span>
          : <span className="text-warn">Нет ни одного надёжного замера (вес/обмолот + контроль) — цифра пока недоказательна.</span>}
      </div>
      <div className="max-h-80 overflow-y-auto scroll-thin">
        <table className="w-full text-xs">
          <thead><tr className="text-muted border-b border-line sticky top-0 bg-white">
            <th className="text-left font-medium py-1.5">Хозяйство</th><th className="text-left font-medium">Год · сезон</th>
            <th className="text-right font-medium">Урожай</th><th className="text-left font-medium">Метод замера</th>
            <th className="text-left font-medium">Контроль</th><th className="text-right font-medium">Вл/засор</th>
          </tr></thead>
          <tbody>
            {recs.map((r, i) => (
              <tr key={i} className={`border-b border-line last:border-0 ${r.reliable ? '' : 'opacity-70'}`}>
                <td className="py-1.5 text-ink">{r.farm}</td>
                <td className="py-1.5 text-muted">{r.year} · {r.seasonType}</td>
                <td className="py-1.5 text-right font-semibold text-ink">{r.yield}</td>
                <td className={`py-1.5 ${METHOD_TONE[r.method]}`}>{r.method}</td>
                <td className="py-1.5 text-muted">{r.control ? `да (${r.rival})` : '— нет'}</td>
                <td className="py-1.5 text-right text-muted">{r.moisture}% / {r.weeds}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted mt-2">Бледные строки — замер «на глаз» или без контроля: в надёжную медиану не идут.</p>
    </Modal>
  )
}

function Backtest() {
  const bt = backtest()
  const drought = bt.bySeason.find((s) => s.type === 'засуха')!
  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <div className="font-bold text-ink text-sm">Точность прогноза · прогноз vs факт (ретро)</div>
        <Pill tone="sky">{bt.coverageSeasons} сезона истории</Pill>
      </div>
      <p className="text-xs text-muted mb-3">Валидация оценки урожайности против фактического намолота на завершённых полях — без неё цифра «проверено полем» недоказательна (и банк не возьмёт под скоринг).</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2">
          <div className="rounded-xl bg-canvas p-3"><div className="text-2xl font-extrabold text-ink">{bt.mape}%</div><div className="text-[11px] text-muted">MAPE (средняя ошибка) · MAE {bt.mae} т/га · n={bt.n}</div></div>
          <div className="rounded-xl bg-canvas p-3"><div className="text-2xl font-extrabold text-ink">{bt.ndviCorr}</div><div className="text-[11px] text-muted">корреляция NDVI-аномалия ↔ гибель (r)</div></div>
          <div className="rounded-xl bg-warn-soft/50 p-3 text-xs text-ink"><AlertTriangle size={13} className="text-warn inline mr-1" /><b>Засуха:</b> MAPE {drought.mape}% — оценка по спутнику завышает в стресс. Под деньги — весовая, спутник вспомогательно.</div>
        </div>
        <div className="col-span-2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, bottom: 16, left: 0 }}>
              <XAxis type="number" dataKey="actual" name="факт" unit=" т/га" tick={{ fontSize: 11 }} domain={[8, 34]} label={{ value: 'факт, т/га', position: 'insideBottom', offset: -6, fontSize: 11 }} />
              <YAxis type="number" dataKey="prognosis" name="прогноз" unit=" т/га" tick={{ fontSize: 11 }} domain={[8, 34]} />
              <ZAxis range={[28, 28]} />
              <ReferenceLine segment={[{ x: 8, y: 8 }, { x: 34, y: 34 }]} stroke="#1a1a1a" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="норма" data={bt.points.filter((p) => p.seasonType === 'норма')} fill="#2da84f" isAnimationActive={false} />
              <Scatter name="засуха" data={bt.points.filter((p) => p.seasonType === 'засуха')} fill="#e5302a" isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-muted text-center -mt-1">точки выше пунктира — прогноз завышен (красные — засуха)</div>
        </div>
      </div>
    </Card>
  )
}

function ZoneCard({ s, drought, onDrill }: { s: ZoneStat; drought: number; onDrill: () => void }) {
  if (!s.hasData) {
    return (
      <Card className="opacity-70">
        <div className="flex items-center justify-between"><span className="font-bold text-ink">{s.zone}</span><Pill tone="gray">нет данных</Pill></div>
        <div className="text-xs text-muted mt-2">Гибрид ещё не испытан в этой зоне. Медиана района — {s.regMedian} т/га.</div>
      </Card>
    )
  }
  const max = Math.max(s.p75, s.regP75, s.mean) * 1.12
  const pct = (v: number) => `${(v / max) * 100}%`
  const low = s.n < REP_MIN
  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-ink">{s.zone}</span>
        <span className={s.deltaPct >= 0 ? 'text-ok font-bold text-sm' : 'text-risk font-bold text-sm'}>{s.deltaPct >= 0 ? '+' : ''}{s.deltaPct}% к медиане района</span>
      </div>
      <div className="flex items-center gap-2 mb-3 text-xs">
        <button onClick={onDrill} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${low ? 'bg-brand-soft text-brand' : 'bg-ok-soft text-ok'} hover:brightness-95`} title="провалиться в первичку: поля, методика замера, год/сезон">{s.n} полей{low ? ' · мало' : ''}<ChevronRight size={12} /></button>
        <span className="text-muted">средняя <b className="text-ink">{s.mean}</b> т/га · разброс {s.p25}–{s.p75}</span>
      </div>

      {/* распределение: полоса p25–p75, маркер средней, тики района */}
      <div className="relative h-7 rounded-lg bg-canvas overflow-hidden mb-1">
        <div className="absolute inset-y-0 rounded bg-brand/25" style={{ left: pct(s.p25), width: pct(s.p75 - s.p25) }} title={`разброс по полям ${s.p25}–${s.p75}`} />
        <div className="absolute inset-y-0 w-[3px] bg-brand" style={{ left: pct(s.mean) }} title={`средняя ${s.mean}`} />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: pct(s.regMedian) }} title={`медиана района ${s.regMedian}`} />
        <div className="absolute inset-y-0 w-0.5 bg-sky" style={{ left: pct(s.regP75) }} title={`топ-25% района ${s.regP75}`} />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted mb-3">
        <span className="flex items-center gap-1"><i className="inline-block w-3 h-2 rounded-sm bg-brand/25" />разброс полей</span>
        <span className="flex items-center gap-1"><i className="inline-block w-[3px] h-3 bg-brand" />средняя</span>
        <span className="flex items-center gap-1"><i className="inline-block w-0.5 h-3 bg-ink" />медиана</span>
        <span className="flex items-center gap-1"><i className="inline-block w-0.5 h-3 bg-sky" />топ-25%</span>
        <span className="ml-auto flex items-center gap-1"><Satellite size={11} />{s.regN.toLocaleString('ru-RU')} полей района</span>
      </div>

      {/* засуха vs норма + устойчивость */}
      <div className="rounded-xl bg-canvas p-2.5 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1"><span className="flex items-center gap-1 text-muted"><Droplets size={12} className="text-risk" />засуха</span><b className="text-ink">{s.droughtYield} т/га</b></div>
          <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-muted"><CloudSun size={12} className="text-ok" />норма</span><b className="text-ink">{s.normalYield} т/га</b></div>
        </div>
        <div className="text-center shrink-0 pl-3 border-l border-line">
          <div className="text-lg font-extrabold leading-none" style={{ color: s.stability >= 0.88 ? '#1f9d55' : s.stability >= 0.8 ? '#e0900a' : '#e5302a' }}>{Math.round(s.stability * 100)}%</div>
          <div className="text-[10px] text-muted">устойчивость{drought >= 5 ? '' : ''}</div>
        </div>
      </div>
    </Card>
  )
}

function Matrix({ highlight, onDrill }: { highlight: string; onDrill: (hybrid: string, zone: string) => void }) {
  const m = portfolioMatrix()
  return (
    <Card pad={false} className="overflow-hidden mb-5">
      <div className="p-4 pb-2 font-bold text-ink text-sm">Карта силы портфеля: гибрид × зона <span className="font-normal text-muted">— где силён (зелёный) / слаб (красный) по Δ к медиане района</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Гибрид</th>
            {m.zones.map((z) => <th key={z} className="text-center font-medium p-3">{z}</th>)}
          </tr></thead>
          <tbody>
            {m.cells.map((row, i) => (
              <tr key={m.hybrids[i]} className={`border-b border-line last:border-0 ${m.hybrids[i] === highlight ? 'bg-brand-soft/30' : ''}`}>
                <td className="p-3 font-semibold text-ink whitespace-nowrap">{m.hybrids[i]}{m.hybrids[i] === highlight && <span className="text-brand"> ●</span>}</td>
                {row.map((c) => (
                  <td key={c.zone} className="p-2 text-center">
                    {c.hasData ? (
                      <button onClick={() => onDrill(c.hybrid, c.zone)} className="w-full rounded-lg py-1.5 px-1 text-white hover:brightness-110 transition" style={{ background: strengthColor(c.deltaPct) }} title={`${c.mean} т/га · ${c.deltaPct >= 0 ? '+' : ''}${c.deltaPct}% · ${c.n} полей — клик: первичка`}>
                        <div className="font-bold leading-none">{c.mean}</div>
                        <div className="text-[10px] opacity-90">{c.deltaPct >= 0 ? '+' : ''}{c.deltaPct}% · {c.n}п</div>
                      </button>
                    ) : <div className="rounded-lg py-1.5 text-[11px] text-muted bg-canvas">—</div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-[11px] text-muted">В ячейке: средняя т/га · Δ% к медиане района · число полей. Пусто — гибрид не испытан в зоне.</div>
    </Card>
  )
}

