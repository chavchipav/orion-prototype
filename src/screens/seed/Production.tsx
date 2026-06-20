import { useSeed } from '../../seedStore'
import { useApp } from '../../store'
import { PLOTS, PU_YIELD_PER_HA, CARRYOVER_PU, PU_PER_HA, STAGE_PROB, PRICE_BY_HYBRID, type PlotStatus } from '../../seedData'
import { rub } from '../../seedDossierData'
import { Card, SectionTitle, Icon, Stat, Pill } from '../../ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowRight } from 'lucide-react'
import { hash as chash } from '../../utils'

const STATUS_TONE: Record<PlotStatus, 'gray' | 'sky' | 'brand' | 'ok'> = {
  'сев': 'gray', 'вегетация': 'sky', 'кастрация': 'sky', 'уборка': 'brand', 'доработка': 'ok',
}

export function Production() {
  const { prod, contracts, leads } = useSeed()
  const { go } = useApp()
  const totalPlan = prod.reduce((s, p) => s + p.planHa, 0)
  const totalCap = prod.reduce((s, p) => s + p.capacityHa, 0)
  const totalCarry = Object.values(CARRYOVER_PU).reduce((s, n) => s + n, 0)

  // спрос реактивен: базовый рыночный + законтрактовано (контракты) + взвешенная воронка (лиды)
  const rows = prod.map((p) => {
    const contractedPU = contracts.filter((c) => c.hybrid === p.hybrid).reduce((s, c) => s + c.pu, 0)
    const leadPU = leads.filter((l) => l.hybrid === p.hybrid).reduce((s, l) => s + Math.round(l.areaHa * PU_PER_HA * (STAGE_PROB[l.stage] || 0)), 0)
    const dynPU = contractedPU + leadPU
    const demandPU = p.demandPU + dynPU
    const expectedPU = p.planHa * PU_YIELD_PER_HA + (CARRYOVER_PU[p.hybrid] || 0)
    const coverage = Math.round((expectedPU / demandPU) * 100)
    const capDeficit = p.planHa - p.capacityHa
    return { ...p, demandPU, dynPU, expectedPU, coverage, capDeficit }
  })
  const capDeficitCount = rows.filter((r) => r.capDeficit > 0).length
  const supplyGap = rows.filter((r) => r.coverage < 100)

  // ₽-крючок дефицита: реальная выработка ограничена МОЩНОСТЯМИ участков
  // (план может покрывать спрос, но участки физически не вырастят столько).
  const deficit = rows.map((r) => {
    const achievablePU = r.capacityHa * PU_YIELD_PER_HA + (CARRYOVER_PU[r.hybrid] || 0)
    const shortfall = Math.max(0, r.demandPU - achievablePU)
    return { hybrid: r.hybrid, shortfall, lost: shortfall * (PRICE_BY_HYBRID[r.hybrid] ?? 18000) }
  })
  const totalShortfall = deficit.reduce((s, d) => s + d.shortfall, 0)
  const totalLost = deficit.reduce((s, d) => s + d.lost, 0)

  return (
    <div>
      <SectionTitle sub="Спрос из воронки → план размножения на участках гибридизации → готовая продукция (п.е.). Узкие места видно сразу.">
        Производство · размножение F1
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card><Stat value={`${totalPlan} га`} label="план размножения" /></Card>
        <Card><Stat value={`${totalCap} га`} label="мощность участков" /></Card>
        <Card><Stat value={totalCarry.toLocaleString('ru-RU')} label="переходящий остаток, п.е." /></Card>
        <Card><Stat value={capDeficitCount} label="гибридов в дефиците мощности" accent /></Card>
      </div>

      {/* ₽-крючок: дефицит выработки = упущенная выручка */}
      {totalShortfall > 0 && (
        <Card className="mb-5 border-brand/30 bg-brand-soft/30">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0"><Icon name="AlertTriangle" size={18} /></span>
            <div className="flex-1 text-sm text-ink">
              Спрос превышает мощности размножения на <b>{totalShortfall.toLocaleString('ru-RU')} п.е.</b> → <b className="text-brand">{rub(totalLost)}</b> упущенной выручки. Узкие места: {deficit.filter((d) => d.shortfall > 0).map((d) => `${d.hybrid} (${rub(d.lost)})`).join(', ')}. Расширить участки гибридизации, поднять норму высева родителей или приоритизировать контракты по марже.
            </div>
            <button onClick={() => go('seedFunnel')} className="shrink-0 inline-flex items-center gap-1 text-sm font-bold text-brand self-center">Приоритеты воронки<ArrowRight size={14} /></button>
          </div>
        </Card>
      )}

      {/* путь продукции */}
      <Card className="mb-5">
        <div className="font-bold text-ink mb-3 text-sm">Путь продукции: родительские формы → F1 → готовая партия</div>
        <div className="flex items-stretch gap-2 text-center">
          {[
            { i: 'Leaf', t: 'Родительские формы', s: '♀ ЦМС × ♂ Rf' },
            { i: 'Map', t: 'Участки гибридизации', s: `${PLOTS.length} участка · ${totalPlan} га` },
            { i: 'Sparkles', t: 'Кастрация / опыление', s: 'изоляция, чистота F1' },
            { i: 'Gauge', t: 'Доработка', s: 'калибровка · протравка' },
            { i: 'ShieldCheck', t: 'Готовая партия', s: `${PU_YIELD_PER_HA} п.е./га` },
          ].map((st, idx, arr) => (
            <div key={st.t} className="flex items-center gap-2 flex-1">
              <div className="flex-1 rounded-xl bg-canvas p-3">
                <Icon name={st.i} size={18} className="text-brand mx-auto" />
                <div className="text-xs font-semibold text-ink mt-1.5">{st.t}</div>
                <div className="text-[11px] text-muted">{st.s}</div>
              </div>
              {idx < arr.length - 1 && <Icon name="ChevronRight" size={16} className="text-muted shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Card>
          <div className="font-bold text-ink mb-3">План vs мощность по гибридам, га</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prod}>
                <XAxis dataKey="hybrid" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
                <Bar dataKey="planHa" name="план, га" fill="#fc3f1d" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="capacityHa" name="мощность, га" fill="#bcbcc4" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="font-bold text-ink mb-3">Покрытие спроса (выработка + остаток vs спрос)</div>
          <div className="space-y-3 mt-1">
            {rows.map((r) => (
              <div key={r.hybrid}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-ink">{r.hybrid}</span>
                  <span className={r.coverage < 100 ? 'text-brand font-bold' : 'text-ok font-semibold'}>{r.coverage}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-canvas overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(r.coverage, 100)}%`, background: r.coverage < 100 ? '#fc3f1d' : '#2da84f' }} />
                </div>
              </div>
            ))}
          </div>
          {!!supplyGap.length && <p className="text-xs text-muted mt-3">Недопокрыт спрос: {supplyGap.map((r) => r.hybrid).join(', ')} — нарастить размножение или поднять норму высева родителей.</p>}
        </Card>
      </div>

      {/* участки гибридизации */}
      <Card pad={false} className="overflow-hidden mb-5">
        <div className="p-4 font-bold text-ink">Участки гибридизации · сезон 2026</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Участок · регион</th>
            <th className="text-left font-medium p-3">Гибрид</th>
            <th className="text-left font-medium p-3">Родительские линии</th>
            <th className="text-right font-medium p-3">Площадь</th>
            <th className="text-left font-medium p-3 w-40">Готовность</th>
            <th className="text-left font-medium p-3">Этап</th>
          </tr></thead>
          <tbody>
            {PLOTS.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                <td className="p-3"><div className="font-semibold text-ink">{p.name}</div><div className="text-xs text-muted">{p.region}</div></td>
                <td className="p-3 text-ink">{p.hybrid}</td>
                <td className="p-3 text-muted text-xs">{p.parentLines}</td>
                <td className="p-3 text-right">{p.areaHa} га</td>
                <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-brand rounded-full" style={{ width: `${p.progressPct}%` }} /></div><span className="text-xs text-muted w-8">{p.progressPct}%</span></div></td>
                <td className="p-3"><Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <CertChain />

      <Card pad={false} className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Гибрид</th>
            <th className="text-right font-medium p-3">Спрос, п.е.</th>
            <th className="text-right font-medium p-3">План, га</th>
            <th className="text-right font-medium p-3">Мощность, га</th>
            <th className="text-right font-medium p-3">Ожид. выработка, п.е.</th>
            <th className="text-left font-medium p-3">Статус мощности</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.hybrid} className="border-b border-line last:border-0">
                <td className="p-3 font-semibold text-ink">{r.hybrid}</td>
                <td className="p-3 text-right">{r.demandPU.toLocaleString('ru-RU')}{r.dynPU > 0 && <div className="text-[10px] text-brand">+{r.dynPU.toLocaleString('ru-RU')} из воронки/контрактов</div>}</td>
                <td className="p-3 text-right">{r.planHa}</td>
                <td className="p-3 text-right text-muted">{r.capacityHa}</td>
                <td className="p-3 text-right">{r.expectedPU.toLocaleString('ru-RU')}</td>
                <td className="p-3">{r.capDeficit > 0 ? <Pill tone="brand"><Icon name="AlertTriangle" size={12} />дефицит {r.capDeficit} га</Pill> : <Pill tone="ok">мощности хватает</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <p className="text-xs text-muted mt-3">«Орион-С» — спрос покрыт по п.е., но участков не хватает ({rows.find((r) => r.hybrid === 'Орион-С')?.capDeficit} га дефицита): главная R&D-ставка упирается в мощности размножения.</p>
    </div>
  )
}

// ── Чистота F1 и сертификация (цепочка по участку) ──
const CERT_LEVEL: Record<PlotStatus, number> = { 'сев': 1, 'вегетация': 2, 'кастрация': 3, 'уборка': 4, 'доработка': 5 }

function CertChain() {
  return (
    <Card pad={false} className="overflow-hidden mb-5">
      <div className="p-4 pb-2">
        <div className="font-bold text-ink">Чистота F1 и сертификация · цепочка по участку</div>
        <div className="text-xs text-muted mt-0.5">Стандарт: изоляция <b>1,25 мили (2 км)</b> · ротация 3 года · «nick» M/F (ряды 6:2/8:2, ♂ на 3–5 дн раньше) · roguing-допуск <b>1:5000</b>, гибридность ≥75% · апробация → сертификат Россельхозцентра · статус семхоза ≥180 баллов.</div>
      </div>
      <div className="px-4 pb-4 space-y-3">
        {PLOTS.map((p) => {
          const lvl = CERT_LEVEL[p.status]
          const gib = 75 + (chash(p.id) % 19)
          const pts = 180 + (chash(p.id + 'x') % 75)
          const stages = [
            { label: 'Изоляция', detail: '2,0 км · ротация 3 г' },
            { label: '«nick» M/F', detail: 'ряды 8:2 · ♂ −4 дня' },
            { label: 'Roguing', detail: `допуск 1:5000 · гибридность ${gib}%` },
            { label: 'Апробация', detail: 'Россельхозцентр' },
            { label: `Сертификат`, detail: `статус семхоза ${pts} б.` },
          ]
          return (
            <div key={p.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-ink">{p.name} <span className="text-muted font-normal">· {p.hybrid}</span></div>
                <Pill tone={lvl >= 5 ? 'ok' : 'gray'}>{lvl >= 5 ? 'сертифицирован' : 'в процессе'}</Pill>
              </div>
              <div className="flex items-stretch gap-1.5">
                {stages.map((st, i) => {
                  const idx = i + 1
                  const done = idx < lvl, active = idx === lvl
                  const bg = done ? 'bg-ok-soft border-ok/30' : active ? 'bg-brand-soft border-brand/40' : 'bg-canvas border-line'
                  const tone = done ? 'text-ok' : active ? 'text-brand' : 'text-muted'
                  return (
                    <div key={st.label} className={`flex-1 rounded-lg border ${bg} p-2`}>
                      <div className={`text-[11px] font-bold flex items-center gap-1 ${tone}`}>
                        {done ? <Icon name="Check" size={11} /> : active ? <Icon name="Loader" size={11} /> : <Icon name="Circle" size={9} />}{st.label}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 leading-tight">{st.detail}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-4 pb-4 -mt-1 text-[11px] text-muted">Бэклог по фидбеку: для семеновода это операционный, не платформенный блок — оцифрован по стандарту, но не его главная боль на платформе.</div>
    </Card>
  )
}
