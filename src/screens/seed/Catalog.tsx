import { useState } from 'react'
import { useCatalog } from '../../catalogStore'
import { useSeed } from '../../seedStore'
import { CATALOG, REGIONS, hybridsForRegion, trialsFor, trialRegions, scaleLabel, type Crop, type CatalogHybrid } from '../../catalogData'
import { Card, SectionTitle, Stat, Pill, Btn } from '../../ui'
import { Tabs } from '../../components/Tabs'
import { Modal } from '../../components/Modal'
import { Reviews, RatingBadge } from '../../components/Reviews'
import { Check, MapPin, Inbox, Eye, Tractor, TrendingUp } from 'lucide-react'

// регион каталога → зона демо-сети семеновода
const REGION_ZONE: Record<string, string> = {
  'Краснодарский край': 'Юг (богара)', 'Ростовская обл.': 'Юг (богара)', 'Ставропольский край': 'Юг (богара)',
  'Воронежская обл.': 'ЦЧО', 'Белгородская обл.': 'ЦЧО', 'Саратовская обл.': 'Поволжье', 'Волгоградская обл.': 'Поволжье',
}

export function Catalog() {
  const { offers, newRequestCount } = useCatalog()
  const [tab, setTab] = useState('cat')
  return (
    <div>
      <SectionTitle sub="Каталог гибридов с полевыми испытаниями, публикация предложений по регионам и заявки агрономов.">
        Мои предложения
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card><Stat value={String(CATALOG.length)} label="гибридов в каталоге" /></Card>
        <Card><Stat value={String(offers.length)} label="опубликовано предложений" /></Card>
        <Card><Stat value={String(newRequestCount)} label="новых заявок от агрономов" accent /></Card>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'cat', label: 'Каталог' }, { key: 'offer', label: 'Предложение' }, { key: 'req', label: `Заявки${newRequestCount ? ' · ' + newRequestCount : ''}` }]} />

      {tab === 'cat' && <CatalogTab />}
      {tab === 'offer' && <OfferTab />}
      {tab === 'req' && <RequestsTab />}
    </div>
  )
}

// ── Каталог ──
function CatalogTab() {
  const { isPublished } = useCatalog()
  const [crop, setCrop] = useState<Crop>('Подсолнечник')
  const [open, setOpen] = useState<CatalogHybrid | null>(null)
  const list = CATALOG.filter((h) => h.crop === crop)
  return (
    <div>
      <div className="inline-flex gap-1 bg-white border border-line rounded-xl p-1 mb-3">
        {(['Подсолнечник', 'Кукуруза'] as Crop[]).map((c) => <button key={c} onClick={() => setCrop(c)} className={`px-3.5 py-2 rounded-lg text-sm font-semibold ${crop === c ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>{c}</button>)}
      </div>
      <Card pad={false} className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Гибрид · бренд</th>
            <th className="text-left font-medium p-3">{crop === 'Кукуруза' ? 'ФАО' : 'Спелость / герб.'}</th>
            <th className="text-left font-medium p-3">Ключевые параметры</th>
            <th className="text-right font-medium p-3">Потенциал</th>
            <th className="text-left font-medium p-3">Публикация</th>
            <th></th>
          </tr></thead>
          <tbody>
            {list.map((h) => {
              const pubCount = REGIONS.filter((r) => isPublished(h.id, r)).length
              return (
                <tr key={h.id} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer" onClick={() => setOpen(h)}>
                  <td className="p-3"><div className="font-semibold text-ink">{h.name}</div><div className="text-xs text-muted">{h.brand}</div><div className="mt-0.5"><RatingBadge id={h.id} kind="seed" /></div></td>
                  <td className="p-3 text-muted">{crop === 'Кукуруза' ? h.fao : `${h.maturity} · ${h.herbTech}`}</td>
                  <td className="p-3 text-xs text-muted">{crop === 'Кукуруза'
                    ? `засух ${h.drought}/9 · холод ${h.cold}/9 · ${h.density}`
                    : `заразиха ${h.broomrape} · масл ${h.oil}% · засух ${scaleLabel(h.drought)}`}</td>
                  <td className="p-3 text-right font-semibold">{h.yieldPotential} ц/га</td>
                  <td className="p-3"><Pill tone={pubCount ? 'ok' : 'gray'}>{pubCount ? `${pubCount} рег.` : 'не опубл.'}</Pill></td>
                  <td className="p-3 text-right"><span className="text-xs text-brand font-semibold">паспорт →</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </Card>
      {open && <HybridModal h={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function HybridModal({ h, onClose }: { h: CatalogHybrid; onClose: () => void }) {
  const { isPublished, togglePublish } = useCatalog()
  const trials = trialsFor(h.id)
  const validated = trialRegions(h.id)
  return (
    <Modal open title={`${h.name} · ${h.brand}`} onClose={onClose}>
      <div className="text-sm">
        <div className="text-xs text-muted mb-3">{h.desc}</div>

        <div className="font-semibold text-ink mb-1.5">Публикация по регионам</div>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {REGIONS.map((r) => {
            const on = isPublished(h.id, r); const val = validated.includes(r)
            return (
              <button key={r} onClick={() => togglePublish(h.id, r)} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${on ? 'border-ok bg-ok-soft/50 text-ink' : 'border-line text-muted'}`}>
                <span className="flex items-center gap-1.5">{on ? <Check size={12} className="text-ok" /> : <span className="w-3" />}{r.replace(/ обл\.| край/, '')}</span>
                {val && <span className="text-[10px] text-sky">испытан</span>}
              </button>
            )
          })}
        </div>

        <div className="font-semibold text-ink mb-1">Полевые испытания</div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-muted border-b border-line"><th className="text-left font-medium py-1.5">Регион · год</th><th className="text-right font-medium">Урожай</th><th className="text-right font-medium">vs контроль</th><th className="text-right font-medium">Поля</th></tr></thead>
          <tbody>
            {trials.map((t, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="py-1.5 text-ink">{t.region.replace(/ обл\.| край/, '')} · {t.year} <span className="text-muted">({t.note})</span></td>
                <td className="py-1.5 text-right font-bold">{t.yield}</td>
                <td className="py-1.5 text-right" style={{ color: t.yield >= t.competitorYield ? '#2da84f' : '#e0900a' }}>{t.yield >= t.competitorYield ? '+' : ''}{Math.round((t.yield - t.competitorYield) * 10) / 10}</td>
                <td className="py-1.5 text-right text-muted">{t.fields}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="text-[11px] text-muted mt-2">Опубликованные гибриды видны агроному в «Маркетплейсе» для соответствующего региона.</p>
        <div className="mt-4 pt-4 border-t border-line"><Reviews id={h.id} kind="seed" /></div>
      </div>
    </Modal>
  )
}

// ── Предложение (конструктор) ──
function OfferTab() {
  const { offers, publishOffer } = useCatalog()
  const [crop, setCrop] = useState<Crop>('Подсолнечник')
  const [region, setRegion] = useState(REGIONS[1])
  const [sel, setSel] = useState<string[]>([])
  const [price, setPrice] = useState('9800')
  const [discount, setDiscount] = useState('10')
  const [risk, setRisk] = useState(true)
  const candidates = hybridsForRegion(crop, region)
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const publish = () => { if (!sel.length) return; publishOffer({ crop, region, hybridIds: sel, pricePerPU: parseInt(price) || 0, discountPct: parseInt(discount) || 0, riskShare: risk }); setSel([]) }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <div className="font-bold text-ink mb-3">Сформировать предложение</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select value={crop} onChange={(e) => { setCrop(e.target.value as Crop); setSel([]) }} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">{(['Подсолнечник', 'Кукуруза'] as Crop[]).map((c) => <option key={c}>{c}</option>)}</select>
          <select value={region} onChange={(e) => { setRegion(e.target.value); setSel([]) }} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
        <div className="text-xs text-muted mb-1.5">Гибриды, испытанные в регионе:</div>
        <div className="space-y-1.5 mb-3 max-h-52 overflow-y-auto scroll-thin">
          {candidates.map((h) => (
            <label key={h.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-line text-sm cursor-pointer hover:border-brand/40">
              <input type="checkbox" checked={sel.includes(h.id)} onChange={() => toggle(h.id)} className="accent-brand" />
              <span className="font-medium text-ink">{h.name}</span><span className="text-xs text-muted">{h.brand} · {h.yieldPotential} ц/га</span>
            </label>
          ))}
          {!candidates.length && <div className="text-xs text-muted py-3">Нет испытанных гибридов в этом регионе.</div>}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="text-xs text-muted">Цена, ₽/п.е.<input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 px-2.5 py-2 rounded-lg border border-line text-sm text-ink" /></label>
          <label className="text-xs text-muted">Скидка, %<input value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full mt-1 px-2.5 py-2 rounded-lg border border-line text-sm text-ink" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink mb-3"><input type="checkbox" checked={risk} onChange={(e) => setRisk(e.target.checked)} className="accent-brand" />Риск-шеринг (60% аванс + остаток по факту урожая)</label>
        <Btn onClick={publish}>Опубликовать предложение ({sel.length})</Btn>
      </Card>

      <Card>
        <div className="font-bold text-ink mb-3">Опубликованные предложения</div>
        <div className="space-y-2">
          {offers.map((o) => (
            <div key={o.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between"><div className="font-semibold text-ink flex items-center gap-1.5"><MapPin size={14} className="text-brand" />{o.region}</div><span className="text-xs text-muted">{o.crop} · {o.date}</span></div>
              <div className="text-xs text-muted mt-1">{o.hybridIds.map((id) => CATALOG.find((h) => h.id === id)?.name).join(', ')}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Pill tone="brand">{o.pricePerPU.toLocaleString('ru-RU')} ₽/п.е.</Pill>
                {o.discountPct > 0 && <Pill tone="ok">−{o.discountPct}%</Pill>}
                {o.riskShare && <Pill tone="sky">риск-шеринг</Pill>}
              </div>
            </div>
          ))}
          {!offers.length && <div className="text-sm text-muted py-3">Пока нет предложений.</div>}
        </div>
      </Card>
    </div>
  )
}

// ── Заявки от агрономов ──
function RequestsTab() {
  const { requests, setRequestStatus } = useCatalog()
  const { addDemo, addLead } = useSeed()
  const zoneOf = (region: string) => REGION_ZONE[region] || 'Юг (богара)'

  const makeDemo = (r: typeof requests[number]) => {
    addDemo({ farm: r.farm, zone: zoneOf(r.region), region: r.region, myHybrid: r.hybridName, rival: 'контроль (стандарт)', sown: '14.06', status: 'посеян', ndviMine: 0.30, ndviRival: 0.30, areaHa: r.areaHa, source: 'Подбор семян' })
    addLead({ farm: r.farm, zone: zoneOf(r.region), hybrid: r.hybridName, areaHa: r.areaHa, stage: 'демо', channel: 'Подбор семян (агроном)' })
    setRequestStatus(r.id, 'демо')
  }
  const toFunnel = (r: typeof requests[number]) => {
    addLead({ farm: r.farm, zone: zoneOf(r.region), hybrid: r.hybridName, areaHa: r.areaHa, stage: 'лид', channel: 'Подбор семян (агроном)' })
    setRequestStatus(r.id, 'воронка')
  }
  const badge = (s: string) => s === 'новая' ? 'bg-brand-soft text-brand' : s === 'обработана' ? 'bg-canvas text-muted' : 'bg-sky-soft text-sky'

  return (
    <div className="space-y-2 max-w-3xl">
      {requests.map((r) => (
        <div key={r.id} className="bg-white border border-line rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-ink flex items-center gap-2"><Inbox size={15} className="text-brand" />{r.farm} <span className="text-sm text-muted font-normal">· {r.agronom}</span></div>
              <div className="text-sm text-muted mt-0.5">{r.crop} · <b className="text-ink">{r.hybridName}</b> · {r.region} · {r.areaHa} га</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge(r.status)}`}>{r.status}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {r.status === 'новая' && <>
              <button onClick={() => makeDemo(r)} className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-3.5 py-2 text-sm font-semibold"><Tractor size={14} />Завести демо</button>
              <button onClick={() => toFunnel(r)} className="flex items-center gap-1.5 bg-canvas text-ink rounded-xl px-3.5 py-2 text-sm font-semibold"><TrendingUp size={14} />В воронку</button>
              <button onClick={() => setRequestStatus(r.id, 'обработана')} className="text-sm font-semibold text-muted hover:text-ink px-2">Отклонить</button>
            </>}
            {r.status === 'демо' && <div className="flex items-center gap-1.5 text-sm text-sky"><Eye size={14} />Демо + лид заведены — в «Демо-сеть «Баттл»» и «Воронке»</div>}
            {r.status === 'воронка' && <div className="flex items-center gap-1.5 text-sm text-sky"><TrendingUp size={14} />Лид в «Воронке» (стадия «лид»)</div>}
            {r.status === 'обработана' && <div className="text-sm text-muted">отклонена</div>}
          </div>
        </div>
      ))}
      {!requests.length && <div className="text-sm text-muted py-6 text-center">Заявок пока нет. Агроном оставит их из «Подбора семян».</div>}
    </div>
  )
}
