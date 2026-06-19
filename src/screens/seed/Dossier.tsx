import { useState } from 'react'
import { useApp } from '../../store'
import { useSeed } from '../../seedStore'
import { HYBRIDS, PRICE_BY_HYBRID, type Hybrid } from '../../seedData'
import { REGION_SUNFLOWER, clientEconomics, rub } from '../../seedDossierData'
import { Card, SectionTitle, Pill } from '../../ui'
import { Satellite, FlaskConical, Wallet, ArrowUpRight, ShieldCheck, Printer } from 'lucide-react'

function Stars({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted w-20">{label}</span>
      <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={`w-2.5 h-2.5 rounded-full ${i <= n ? 'bg-brand' : 'bg-line'}`} />)}</span>
    </div>
  )
}

export function SeedDossier() {
  const { go } = useApp()
  const { demos } = useSeed()
  const [hid, setHid] = useState('orionS') // главная ставка R&D — под демо Надежды
  const h: Hybrid = HYBRIDS.find((x) => x.id === hid) ?? HYBRIDS[0]

  // демо-сеть «Баттл» по этому гибриду
  const hdemos = demos.filter((d) => d.myHybrid === h.name)
  const harvested = hdemos.filter((d) => d.yieldMine != null && d.yieldRival != null)
  const gainVsRival = harvested.length
    ? +(harvested.reduce((s, d) => s + ((d.yieldMine ?? 0) - (d.yieldRival ?? 0)), 0) / harvested.length).toFixed(2)
    : null
  const ndviGain = hdemos.length
    ? +(hdemos.reduce((s, d) => s + (d.ndviMine - d.ndviRival), 0) / hdemos.length).toFixed(2)
    : null

  // экономика — в ЛУЧШЕЙ рекомендованной зоне (продаём туда, где гибрид к месту)
  const recommended = h.proven.filter((p) => h.zones.includes(p.zone))
  const primary = (recommended.length ? recommended : h.proven).slice().sort((a, b) => b.yield - a.yield)[0]
  const eco = clientEconomics(primary.zone, primary.yield, PRICE_BY_HYBRID[h.name] ?? 18900)
  const primPct = Math.round((primary.yield / (REGION_SUNFLOWER[primary.zone]?.median ?? primary.yield) - 1) * 100)
  const fits = eco.benefit > 0

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle sub="Один экран-аргумент Genesis: результат демо-сети + бенчмарк против района (спутниковый слой) + выгода клиента в ₽. Несите клиенту в сделку.">
          Паспорт семян
        </SectionTitle>
        <button onClick={() => window.print()} className="no-print shrink-0 inline-flex items-center gap-1.5 bg-canvas hover:bg-line text-ink rounded-xl px-3.5 py-2 text-sm font-semibold"><Printer size={15} />Печать</button>
      </div>

      {/* выбор гибрида */}
      <div className="flex flex-wrap gap-2 mb-4">
        {HYBRIDS.map((x) => (
          <button key={x.id} onClick={() => setHid(x.id)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${x.id === hid ? 'bg-brand text-white border-brand' : 'bg-white text-ink border-line hover:bg-canvas'}`}>{x.name}</button>
        ))}
      </div>

      {/* шапка гибрида */}
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-ink">{h.name}</h3>
              <Pill tone={h.reg === 'в реестре' ? 'ok' : 'brand'}>{h.reg}</Pill>
              {h.clearfield && <Pill tone="sky">Clearfield</Pill>}
            </div>
            <p className="text-sm text-muted mb-3">{h.note}</p>
            <div className="flex flex-wrap gap-1.5">
              {h.zones.map((z) => <span key={z} className="text-[11px] px-2 py-0.5 rounded-full bg-canvas text-muted">{z}</span>)}
            </div>
          </div>
          <div className="space-y-1.5 shrink-0">
            <Stars n={h.drought} label="засуха" />
            <Stars n={h.broomrape} label="заразиха" />
            <div className="flex items-center gap-2 pt-1"><span className="text-xs text-muted w-20">потенциал</span><b className="text-ink text-sm">{h.potential} т/га</b></div>
            <div className="flex items-center gap-2"><span className="text-xs text-muted w-20">масличность</span><b className="text-ink text-sm">{h.oil}%</b></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 1. демо-сеть */}
        <Card>
          <div className="flex items-center gap-2 font-bold text-ink mb-2"><FlaskConical size={15} className="text-brand" />Сравнение на демо-поле</div>
          {hdemos.length ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-extrabold text-ok">{gainVsRival != null ? `${gainVsRival > 0 ? '+' : ''}${gainVsRival} т/га` : '—'}</span>
                <span className="text-xs text-muted">vs конкурент (факт)</span>
              </div>
              <div className="text-xs text-muted mb-2">NDVI {ndviGain != null ? `${ndviGain > 0 ? '+' : ''}${ndviGain}` : '—'} · {hdemos.length} демо · {harvested.length} убрано</div>
              <div className="space-y-1.5">
                {hdemos.slice(0, 3).map((d) => (
                  <div key={d.id} className="text-xs flex items-center justify-between">
                    <span className="text-ink truncate mr-2">{d.farm}<span className="text-muted"> vs {d.rival}</span></span>
                    {d.yieldMine != null && d.yieldRival != null
                      ? <span className="font-semibold shrink-0" style={{ color: d.yieldMine >= d.yieldRival ? '#2da84f' : '#e5302a' }}>{d.yieldMine}/{d.yieldRival}</span>
                      : <Pill tone="gray">{d.status}</Pill>}
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-muted">Демо по гибриду пока не заложены.</p>}
        </Card>

        {/* 2. региональный бенчмарк — спутниковый слой */}
        <Card>
          <div className="flex items-center gap-2 font-bold text-ink mb-2"><Satellite size={15} className="text-brand" />Бенчмарк против района</div>
          <div className="space-y-2.5 mt-1">
            {h.proven.map((p) => {
              const r = REGION_SUNFLOWER[p.zone]
              if (!r) return null
              const max = Math.max(p.yield, r.p75) * 1.05
              const dPct = Math.round((p.yield / r.median - 1) * 100)
              return (
                <div key={p.zone}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink font-semibold">{p.zone}</span>
                    <span className={dPct >= 0 ? 'text-ok font-bold' : 'text-risk font-bold'}>{dPct >= 0 ? '+' : ''}{dPct}% к медиане</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-canvas overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${(p.yield / max) * 100}%` }} />
                    <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(r.median / max) * 100}%` }} title="медиана района" />
                    <div className="absolute inset-y-0 w-0.5 bg-sky" style={{ left: `${(r.p75 / max) * 100}%` }} title="топ-25% района" />
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">гибрид {p.yield} · медиана {r.median} · топ-25% {r.p75} т/га</div>
                </div>
              )
            })}
          </div>
          <div className="text-[10px] text-muted mt-2.5 flex items-center gap-1"><Satellite size={11} />Спутниковый слой: {REGION_SUNFLOWER[primary.zone]?.n.toLocaleString('ru-RU')} полей в районе по подсолнечнику</div>
        </Card>

        {/* 3. экономика для клиента */}
        <Card>
          <div className="flex items-center gap-2 font-bold text-ink mb-2"><Wallet size={15} className="text-brand" />Выгода клиента</div>
          <div className="text-2xl font-extrabold leading-none" style={{ color: fits ? '#1a1a1a' : '#e5302a' }}>{rub(eco.benefit)}<span className="text-sm font-semibold text-muted">/га</span></div>
          <div className="text-xs text-muted mb-3">чистая выгода в зоне «{eco.zone}» · {fits ? <>окупаемость <b className="text-ok">×{eco.payback}</b></> : <b className="text-risk">не окупается в этой зоне</b>}</div>
          <div className="space-y-1.5 text-sm">
            <Eco k="Прибавка к медиане" v={`${eco.gainT > 0 ? '+' : ''}${eco.gainT} т/га`} tone={eco.gainT >= 0 ? '#2da84f' : '#e5302a'} />
            <Eco k="Выручка с прибавки" v={rub(eco.revenueGain)} />
            <Eco k="Премия за семена" v={`−${rub(eco.premium).replace('−', '')}`} muted />
            <div className="border-t border-line pt-1.5 flex items-center justify-between"><span className="text-xs text-muted">Выгода клиента</span><b className="text-ink">{rub(eco.benefit)}/га</b></div>
          </div>
        </Card>
      </div>

      {/* итог-аргумент + CTA */}
      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${fits ? 'border-ok/30 bg-ok-soft/40' : 'border-warn/30 bg-warn-soft/40'}`}>
        <ShieldCheck size={18} className={`shrink-0 mt-0.5 ${fits ? 'text-ok' : 'text-warn'}`} />
        <div className="text-sm text-ink flex-1">
          {fits
            ? <><b>{h.name}</b> в зоне «{primary.zone}»: {gainVsRival != null && gainVsRival > 0 && <>в демо +{gainVsRival} т/га к конкуренту, </>}на {primPct}% выше медианы района (спутниковый слой) → клиент зарабатывает <b>{rub(eco.benefit)}/га</b> сверх премии за семена. Это аргумент к контракту, а не «доверьтесь нам».</>
            : <><b>{h.name}</b> в лучшей зоне «{primary.zone}» идёт {primPct >= 0 ? `+${primPct}%` : `${primPct}%`} к медиане — прибавка не покрывает премию за семена. Не продавать как премиум-гибрид здесь; смотреть другие зоны или позиционировать как commodity.</>}
        </div>
        <button onClick={() => go('seedFunnel')} className="shrink-0 inline-flex items-center gap-1.5 bg-ok text-white rounded-xl px-4 py-2 text-sm font-semibold self-center"><ArrowUpRight size={15} />В воронку</button>
      </div>
    </div>
  )
}

function Eco({ k, v, tone, muted }: { k: string; v: string; tone?: string; muted?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-xs text-muted">{k}</span><span className="font-semibold" style={{ color: tone || (muted ? '#6b6b6b' : '#1b1b1b') }}>{v}</span></div>
}
