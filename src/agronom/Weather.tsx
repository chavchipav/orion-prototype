import { useState, type ReactNode } from 'react'
import { useApp } from '../store'
import { AG_FIELDS, type Crop } from '../agronomData'
import { DAILY, HISTORY, ANOMALY, MONTHLY, SOIL_PROFILE, gddTrack, sprayRating, dtColor, type WxDay } from '../agronomWeather'
import { Tabs } from '../components/Tabs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, BarChart, Line, LineChart, Legend } from 'recharts'
import {
  Wind, Droplets, Sprout, CloudSun, CloudRain, Thermometer, CloudDrizzle, Check, AlertTriangle,
  Sun, Layers, FlaskRound, Snowflake, Bug, ArrowRight, Gauge,
} from 'lucide-react'

const CROPS = [...new Set(AG_FIELDS.map((f) => f.crop))].filter((c) => c !== 'Пар') as Crop[]

export function Weather() {
  const { go } = useApp()
  const [tab, setTab] = useState('now')
  const [crop, setCrop] = useState<Crop>(CROPS.includes('Подсолнечник') ? 'Подсолнечник' : CROPS[0])
  const d0 = DAILY[0]
  const spray = sprayRating(d0)

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2"><CloudSun size={20} className="text-sky" />Погода · агро-метео</h2>
        <button onClick={() => go('agPlanner')} className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 mt-1">Планировщик работ<ArrowRight size={12} /></button>
      </div>
      <p className="text-sm text-muted mb-4">Метеостанции + спутник + модель. Агро-индексы: ΔT (опрыскивание), ET₀ и влагобаланс, GDD, профиль почвы, риски.</p>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'now', label: 'Сейчас' }, { key: 'spray', label: 'Опрыскивание · ΔT' }, { key: 'gdd', label: 'GDD · развитие' },
        { key: 'water', label: 'Влага · ET₀' }, { key: 'soil', label: 'Почва' }, { key: 'risk', label: 'Риски' },
        { key: 'norm', label: 'История · норма' },
      ]} />

      {/* ── СЕЙЧАС ── */}
      {tab === 'now' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="text-muted text-sm mb-1">Сегодня · «Хлеборобное»</div>
            <div className="text-5xl font-extrabold text-ink">{d0.tMax}°<span className="text-lg text-muted font-bold">/{d0.tMin}°</span></div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Mini icon={<Thermometer size={14} />} v={`${d0.wetBulb}°`} l="влажный термометр" />
              <Mini icon={<Wind size={14} />} v={`${d0.windDay} м/с`} l="ветер" />
              <Mini icon={<Droplets size={14} />} v={`${d0.humidity}%`} l="влажность" />
              <Mini icon={<CloudDrizzle size={14} />} v={`${d0.dew}°`} l="точка росы" />
              <Mini icon={<FlaskRound size={14} />} v={`${d0.et0} мм`} l="ET₀ сегодня" />
              <Mini icon={<Sun size={14} />} v={`${d0.solar} МДж`} l="солн. радиация" />
              <Mini icon={<Sprout size={14} />} v={`${d0.soilT10}°`} l="почва 10 см" />
              <Mini icon={<Gauge size={14} />} v={`${d0.soilM}%`} l="влагозапас" />
            </div>
            <div className="mt-3 rounded-lg text-xs font-semibold px-3 py-2 flex items-center gap-1.5" style={{ background: dtColor(spray.rate) + '22', color: dtColor(spray.rate) }}>
              {spray.rate === 'идеально' ? <Check size={13} /> : <AlertTriangle size={13} />}
              Опрыскивание: {spray.rate} ({spray.note})
            </div>
          </div>
          <div className="bg-white border border-line rounded-2xl p-5 md:col-span-2">
            <div className="font-bold text-ink mb-3">Прогноз 12 дней</div>
            <div className="flex gap-1 overflow-x-auto scroll-thin pb-1">
              {DAILY.map((d) => (
                <div key={d.date} className="shrink-0 w-[74px] text-center rounded-xl border border-line p-2">
                  <div className="text-[11px] text-muted">{d.dow} {d.date}</div>
                  <div className="text-sm font-bold text-ink mt-0.5">{d.tMax}°<span className="text-[10px] text-muted font-normal">/{d.tMin}°</span></div>
                  <div className="text-[10px] text-sky flex items-center justify-center gap-0.5"><CloudRain size={9} />{d.rainMm}</div>
                  <div className="text-[10px] text-muted flex items-center justify-center gap-0.5"><Wind size={9} />{d.windDay}</div>
                  <div className="mt-1 rounded-md text-[10px] font-bold py-0.5" style={{ background: dtColor(sprayRating(d).rate) + '22', color: dtColor(sprayRating(d).rate) }}>ΔT {d.deltaT}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ChartCard title="Температура · история 14 дн">
                <AreaChart data={HISTORY}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={[20, 40]} /><Tooltip /><Area type="monotone" dataKey="t" stroke="#e0900a" fill="#fdf0d8" strokeWidth={2} isAnimationActive={false} /></AreaChart>
              </ChartCard>
              <ChartCard title="Осадки · история 14 дн">
                <BarChart data={HISTORY}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="rain" fill="#2b6def" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart>
              </ChartCard>
            </div>
          </div>
        </div>
      )}

      {/* ── ОПРЫСКИВАНИЕ · ΔT ── */}
      {tab === 'spray' && (
        <div className="space-y-4">
          <Info>Окно опрыскивания по <b>Delta T</b> (сухой − влажный термометр): <b>2–8</b> — идеально; <b>&lt;2</b> — высокая влажность, риск инверсии/сноса; <b>&gt;10</b> — капля пересыхает. Плюс ветер ≤5 м/с и отсутствие осадков. Эти же правила питают <button onClick={() => go('agPlanner')} className="text-brand font-semibold hover:underline">Планировщик</button>.</Info>
          <div className="rounded-2xl bg-white border border-line overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line bg-canvas/50"><th className="text-left font-medium p-2.5">День</th><th className="text-right font-medium p-2.5">ΔT</th><th className="text-right font-medium p-2.5">Ветер</th><th className="text-right font-medium p-2.5">Влажн.</th><th className="text-left font-medium p-2.5">Ночь</th><th className="text-left font-medium p-2.5">Окно</th></tr></thead>
              <tbody>
                {DAILY.map((d) => { const r = sprayRating(d); return (
                  <tr key={d.date} className="border-b border-line last:border-0">
                    <td className="p-2.5 text-ink">{d.dow} {d.date}</td>
                    <td className="p-2.5 text-right font-bold" style={{ color: dtColor(d.dtRate) }}>{d.deltaT}</td>
                    <td className="p-2.5 text-right text-muted">{d.windDay} м/с</td>
                    <td className="p-2.5 text-right text-muted">{d.humidity}%</td>
                    <td className="p-2.5 text-xs text-muted">{d.clearNight ? 'инверсия ⚠' : 'без инверсии'}</td>
                    <td className="p-2.5"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: dtColor(r.rate) + '22', color: dtColor(r.rate) }}>{r.rate}</span> <span className="text-[11px] text-muted">{r.note}</span></td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── GDD ── */}
      {tab === 'gdd' && (() => { const g = gddTrack(crop); const max = g.stages[g.stages.length - 1]?.gdd || g.accum
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Культура:</span>
              <select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm font-semibold">{CROPS.map((c) => <option key={c}>{c}</option>)}</select>
              <span className="text-xs text-muted">база {g.base}°C</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat v={`${g.accum} GDD`} l={`Σ активных температур (>${g.base}°)`} />
              <Stat v={g.current || '—'} l="текущая фаза" />
              <Stat v={g.next ? `${g.next.name} · ${g.toNext} GDD` : 'созрел'} l={g.next ? `до фазы · ~${g.etaDays} дн по прогнозу` : 'фазы пройдены'} accent />
            </div>
            <div className="rounded-2xl bg-white border border-line p-5">
              <div className="font-bold text-ink mb-4">Накопление GDD по фазам</div>
              <div className="relative h-3 rounded-full bg-canvas mb-16">
                <div className="absolute h-3 rounded-full bg-brand/30" style={{ width: `${Math.min(100, (g.accum / max) * 100)}%` }} />
                {g.stages.map((s) => (
                  <div key={s.name} className="absolute -top-1" style={{ left: `${Math.min(100, (s.gdd / max) * 100)}%` }}>
                    <div className={`w-5 h-5 -ml-2.5 rounded-full grid place-items-center ${s.reached ? 'bg-ok text-white' : 'bg-white border-2 border-line'}`}>{s.reached && <Check size={11} />}</div>
                    <div className="text-[10px] text-muted mt-1 -ml-6 w-20 text-center leading-tight">{s.name}<br /><b className="text-ink">{s.gdd}</b></div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted mt-2">Накоплено <b className="text-ink">{g.accum} GDD</b>. {g.next ? <>До «{g.next.name}» осталось <b className="text-ink">{g.toNext} GDD</b> — по прогнозу ~<b className="text-ink">{g.etaDays} дней</b>.</> : 'Все фазы пройдены — к уборке.'}</div>
            </div>
          </div>
        )
      })()}

      {/* ── ВЛАГА · ET₀ ── */}
      {tab === 'water' && (() => {
        const sumEt = Math.round(DAILY.reduce((s, d) => s + d.et0, 0)); const sumRain = Math.round(DAILY.reduce((s, d) => s + d.rainMm, 0))
        const deficit = sumEt - sumRain
        const chart = DAILY.map((d) => ({ d: d.date.slice(0, 5), et0: d.et0, rain: d.rainMm }))
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat v={`${sumEt} мм`} l="ET₀ за 12 дн (расход)" />
              <Stat v={`${sumRain} мм`} l="осадки за 12 дн (приход)" />
              <Stat v={`−${deficit} мм`} l="дефицит влаги" accent />
              <Stat v={`${d0.soilM}%`} l="влагозапас сейчас" />
            </div>
            <div className="rounded-2xl bg-white border border-line p-5">
              <div className="font-bold text-ink mb-3">Влагобаланс: приход (осадки) vs расход (ET₀)</div>
              <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="d" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="rain" name="Осадки, мм" fill="#2b6def" radius={[4, 4, 0, 0]} isAnimationActive={false} /><Bar dataKey="et0" name="ET₀, мм" fill="#e0900a" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
            </div>
            <Info tone="risk"><AlertTriangle size={14} className="inline -mt-0.5 mr-1" />{ANOMALY.droughtNote}. Хозяйство на богаре (без полива) — дефицит бьёт по наливу; перенести азотные подкормки до осадков, влагосберегающие обработки.</Info>
          </div>
        )
      })()}

      {/* ── ПОЧВА ── */}
      {tab === 'soil' && (
        <div className="space-y-4">
          <Info>Температура и влагозапас почвы по глубине (модель + датчики). Важно для сева (порог прорастания) и доступности влаги корням.</Info>
          <div className="rounded-2xl bg-white border border-line p-5">
            <div className="font-bold text-ink mb-4 flex items-center gap-1.5"><Layers size={16} className="text-muted" />Профиль почвы</div>
            <div className="space-y-3">
              {SOIL_PROFILE.map((s) => (
                <div key={s.cm} className="flex items-center gap-3">
                  <div className="w-14 text-sm font-semibold text-ink shrink-0">{s.cm} см</div>
                  <div className="flex-1"><div className="flex items-center justify-between text-xs mb-0.5"><span className="text-muted">температура</span><b className="text-ink">{s.temp}°</b></div><div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full bg-warn" style={{ width: `${Math.min(100, (s.temp / 30) * 100)}%` }} /></div></div>
                  <div className="flex-1"><div className="flex items-center justify-between text-xs mb-0.5"><span className="text-muted">влагозапас</span><b className="text-ink">{s.moisture}%</b></div><div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full bg-sky" style={{ width: `${Math.min(100, (s.moisture / 34) * 100)}%` }} /></div></div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted mt-4">Почва 10 см = <b className="text-ink">{SOIL_PROFILE[1].temp}°</b> — выше порога прорастания (8–10°) для большинства культур. Влага в пахотном слое снижается — поверхность пересыхает, корни добирают с глубины.</div>
          </div>
        </div>
      )}

      {/* ── РИСКИ ── */}
      {tab === 'risk' && (() => {
        const heat = DAILY.filter((d) => d.heat); const dis = DAILY.filter((d) => d.diseaseRisk); const frost = DAILY.filter((d) => d.frost)
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RiskCard icon={<Thermometer size={18} className="text-risk" />} title="Тепловой стресс" days={heat} tone="risk"
              body={heat.length ? <>Дней с риском: <b>{heat.length}</b>. Влажный термометр ≥24° / Tmax ≥33° — стресс растений, опрыскивание только в прохладные часы.</> : 'Нет дней с тепловым стрессом.'} list={heat.map((d) => `${d.date}: Tmax ${d.tMax}°, влажн.терм. ${d.wetBulb}°`)} />
            <RiskCard icon={<Bug size={18} className="text-warn" />} title="Болезни (листовое увлажнение)" days={dis} tone="warn"
              body={dis.length ? <>Дней с риском: <b>{dis.length}</b>. Листовое увлажнение ≥10 ч при 15–26° — окно заражения (склеротиниоз/пероноспороз). Готовить фунгицид.</> : 'Низкое листовое увлажнение — риск болезней низкий.'} list={dis.map((d) => `${d.date}: увлажнение ${d.leafWetH} ч`)} />
            <RiskCard icon={<Snowflake size={18} className="text-sky" />} title="Заморозки" days={frost} tone="sky"
              body={frost.length ? <>Дней с риском: <b>{frost.length}</b>. Tmin ≤2° — защита всходов/цвета.</> : 'Нет риска заморозков (сезон). Монитор включится осенью.'} list={frost.map((d) => `${d.date}: Tmin ${d.tMin}°`)} />
          </div>
        )
      })()}

      {/* ── ИСТОРИЯ · НОРМА (аномалия к климатической норме) ── */}
      {tab === 'norm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat v={`+${ANOMALY.tempC}°C`} l="температура к норме (теплее)" accent />
            <Stat v={`${ANOMALY.rainPct}%`} l="осадки к норме (суше)" accent />
            <Stat v={`${ANOMALY.gtk}`} l="ГТК Селянинова (<0.5 — засуха)" accent />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-line p-5">
              <div className="font-bold text-ink mb-3">Температура: сезон vs климат-норма</div>
              <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line dataKey="tFact" name="Факт, °C" stroke="#e0900a" strokeWidth={2.5} isAnimationActive={false} /><Line dataKey="tNorm" name="Норма, °C" stroke="#9a9a9a" strokeWidth={2} strokeDasharray="5 4" isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            </div>
            <div className="rounded-2xl bg-white border border-line p-5">
              <div className="font-bold text-ink mb-3">Осадки: сезон vs климат-норма</div>
              <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={MONTHLY}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="m" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="rainFact" name="Факт, мм" fill="#2b6def" radius={[4, 4, 0, 0]} isAnimationActive={false} /><Bar dataKey="rainNorm" name="Норма, мм" fill="#cdd2cf" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
            </div>
          </div>
          <Info tone="risk"><AlertTriangle size={14} className="inline -mt-0.5 mr-1" />{ANOMALY.droughtNote}. Сезон теплее нормы на +{ANOMALY.tempC}°C при дефиците осадков — риск недобора по наливу; влагосберегающие обработки, перенос азотных подкормок до осадков.</Info>
        </div>
      )}
    </div>
  )
}

function Mini({ icon, v, l }: { icon: ReactNode; v: string; l: string }) {
  return <div className="rounded-lg bg-canvas py-2 px-2 text-center"><div className="text-muted mx-auto w-fit">{icon}</div><div className="text-sm font-bold mt-1 text-ink">{v}</div><div className="text-[10px] text-muted leading-tight">{l}</div></div>
}
function Stat({ v, l, accent }: { v: ReactNode; l: string; accent?: boolean }) {
  return <div className="rounded-2xl bg-white border border-line p-4"><div className={`text-2xl font-extrabold ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-0.5">{l}</div></div>
}
function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <div><div className="text-xs font-semibold text-ink mb-1">{title}</div><div className="h-36"><ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer></div></div>
}
function Info({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'risk' }) {
  return <div className={`text-sm rounded-xl px-4 py-3 ${tone === 'risk' ? 'bg-risk-soft/50 text-ink' : 'bg-canvas text-muted'}`}>{children}</div>
}
function RiskCard({ icon, title, days, body, list }: { icon: ReactNode; title: string; days: WxDay[]; body: ReactNode; tone: string; list: string[] }) {
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <div className="flex items-center gap-2 font-bold text-ink mb-2">{icon}{title}<span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-canvas text-muted">{days.length}</span></div>
      <div className="text-sm text-muted">{body}</div>
      {list.length > 0 && <div className="mt-2 space-y-1">{list.slice(0, 4).map((x, i) => <div key={i} className="text-[11px] text-muted bg-canvas rounded px-2 py-1">{x}</div>)}</div>}
    </div>
  )
}
