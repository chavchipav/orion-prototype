import { useState, useMemo } from 'react'
import { useCatalog } from '../catalogStore'
import { REGIONS, trialsFor, trialAvg, scaleLabel, type Crop, type CatalogHybrid } from '../catalogData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { Reviews, RatingBadge } from '../components/Reviews'
import { ChevronRight, ChevronLeft, Sprout, Wheat, Droplets, Sun, PlayCircle, X, Check, FlaskConical, Headset } from 'lucide-react'

const AGRONOM = 'Виктор Степанович'
const FARM = 'Агрофирма «Заря»'
const CROP_TINT: Record<Crop, string> = { 'Подсолнечник': '#e0a92b', 'Кукуруза': '#7aa53a' }

type Answers = { purpose?: string; irrigation?: string; tech?: string; herb?: string; region?: string }
const ORDER: Record<Crop, string[]> = {
  'Кукуруза': ['purpose', 'irrigation', 'tech', 'region', 'results'],
  'Подсолнечник': ['purpose', 'herb', 'irrigation', 'region', 'results'],
}
const STEP_TITLE: Record<string, string> = { purpose: 'Назначение', irrigation: 'Орошение', tech: 'Технология', herb: 'Гербицидная технология', region: 'Регион' }
type Opt = { v: string; label: string; sub?: string; icon: typeof Sun }
const OPTS = {
  purposeCorn: [{ v: 'Зерно', label: 'Зерно', icon: Wheat }, { v: 'Силос', label: 'Силос', icon: Sprout }] as Opt[],
  purposeSun: [{ v: 'Масличный', label: 'Масличный', icon: Droplets }, { v: 'Кондитерский', label: 'Кондитерский', icon: Sprout }] as Opt[],
  irrigation: [{ v: 'Нет', label: 'Нет', sub: 'Богара', icon: Sun }, { v: 'Да', label: 'Да', sub: 'Орошение', icon: Droplets }] as Opt[],
  tech: [
    { v: 'Экстенсивная', label: 'Экстенсивная', sub: 'Естественное плодородие, минимум удобрений и защиты.', icon: Sprout },
    { v: 'Интенсивная', label: 'Интенсивная', sub: 'Планируемый урожай, оптимальное питание и защита.', icon: FlaskConical },
    { v: 'Высокоинтенсивная', label: 'Высокоинтенсивная', sub: 'Урожайность близко к биологическому потенциалу.', icon: Wheat },
  ] as Opt[],
  herb: [
    { v: 'Классика', label: 'Классика', sub: 'Почвенные + по вегетации гербициды.', icon: Sprout },
    { v: 'Clearfield', label: 'Clearfield', sub: 'Имидазолиноны — контроль заразихи и сорняков.', icon: Droplets },
    { v: 'Express', label: 'Express', sub: 'Трибенурон-метил по вегетации.', icon: FlaskConical },
  ] as Opt[],
}

export function SeedSelector() {
  const [crop, setCrop] = useState<Crop | null>(null)
  const [idx, setIdx] = useState(0)
  const [ans, setAns] = useState<Answers>({})
  const [passport, setPassport] = useState<CatalogHybrid | null>(null)
  const [reqFor, setReqFor] = useState<CatalogHybrid | null>(null)
  const [video, setVideo] = useState<CatalogHybrid | null>(null)

  if (!crop) return <CulturePick onPick={(c) => { setCrop(c); setIdx(0); setAns({}) }} />

  const steps = ORDER[crop]
  const stepKey = steps[idx]
  const total = steps.length
  const percent = Math.round((idx / (total - 1)) * 100)
  const set = (k: keyof Answers, v: string, advance = true) => { setAns((a) => ({ ...a, [k]: v })); if (advance) setIdx((i) => Math.min(i + 1, total - 1)) }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="bg-white border border-line rounded-2xl shadow-sm max-w-6xl mx-auto">
        <div className="flex">
          {/* main */}
          <div className="flex-1 min-w-0 p-7">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-ink">Подберите свой гибрид {crop === 'Кукуруза' ? 'кукурузы' : 'подсолнечника'}</h2>
              <button onClick={() => setCrop(null)} className="text-xs text-muted hover:text-ink">сменить культуру</button>
            </div>

            {stepKey === 'purpose' && <OptionStep title="Назначение" opts={crop === 'Кукуруза' ? OPTS.purposeCorn : OPTS.purposeSun} value={ans.purpose} onPick={(v) => set('purpose', v)} />}
            {stepKey === 'irrigation' && <OptionStep title="Орошение" opts={OPTS.irrigation} value={ans.irrigation} onPick={(v) => set('irrigation', v)} />}
            {stepKey === 'tech' && <OptionStep title="Технология" opts={OPTS.tech} value={ans.tech} onPick={(v) => set('tech', v)} />}
            {stepKey === 'herb' && <OptionStep title="Гербицидная технология" opts={OPTS.herb} value={ans.herb} onPick={(v) => set('herb', v)} />}
            {stepKey === 'region' && (
              <div className="mt-5">
                <div className="text-lg font-semibold text-ink mb-3">Регион</div>
                <select value={ans.region || ''} onChange={(e) => set('region', e.target.value)} className="w-80 px-4 py-3 rounded-xl bg-white border border-line text-sm text-ink">
                  <option value="" disabled>выберите регион</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}
            {stepKey === 'results' && <Results crop={crop} ans={ans} onPassport={setPassport} onRequest={setReqFor} onVideo={setVideo} />}

            {/* nav */}
            <div className="flex items-center gap-3 mt-7">
              {idx > 0 && <button onClick={() => setIdx((i) => i - 1)} className="flex items-center gap-2 bg-[#e8456b] text-white font-bold text-sm rounded-md pl-5 pr-3 py-2.5"><span className="tracking-wide">НАЗАД</span><span className="bg-white text-[#e8456b] rounded grid place-items-center w-6 h-6"><ChevronLeft size={16} /></span></button>}
            </div>
          </div>

          {/* sidebar */}
          <aside className="w-64 shrink-0 border-l border-line p-6">
            <div className="text-sm text-muted pb-3 border-b border-line">Шаг {idx + 1} из {total}</div>
            {(['purpose', crop === 'Кукуруза' ? 'irrigation' : 'herb', crop === 'Кукуруза' ? 'tech' : 'irrigation', 'region'] as (keyof Answers)[]).map((k) => ans[k] && (
              <div key={k} className="py-3 border-b border-line">
                <div className="text-xs text-muted">{STEP_TITLE[k]}</div>
                <div className="font-bold text-ink">{ans[k]}</div>
              </div>
            ))}
            <div className="pt-4">
              <div className="text-sm text-muted">Гибрид подобран</div>
              <div className="font-bold text-ink mb-2">{percent}%</div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-[#9bd35a] rounded-full transition-all" style={{ width: `${Math.max(6, percent)}%` }} /></div>
            </div>
          </aside>
        </div>
      </div>

      {/* hotline */}
      <div className="max-w-6xl mx-auto mt-4 flex justify-center">
        <div className="bg-white border border-line rounded-2xl px-6 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-brand-soft text-brand grid place-items-center"><Headset size={20} /></div>
          <div><div className="text-xs text-muted">Телефон горячей линии</div><div className="font-bold text-ink">+7 (800) 234-20-15</div></div>
        </div>
      </div>

      {passport && <Passport h={passport} region={ans.region} onClose={() => setPassport(null)} onRequest={() => { setReqFor(passport); setPassport(null) }} />}
      {reqFor && <RequestModal h={reqFor} region={ans.region!} onClose={() => setReqFor(null)} />}
      {video && <VideoModal h={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

function CulturePick({ onPick }: { onPick: (c: Crop) => void }) {
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="bg-white border border-line rounded-2xl shadow-sm max-w-3xl mx-auto p-8">
        <h2 className="text-xl font-bold text-ink mb-1">Подбор семян</h2>
        <p className="text-sm text-muted mb-6">Подберите идеальный гибрид под ваше поле, зону и технологию — на основе полевых испытаний.</p>
        <div className="grid grid-cols-2 gap-4">
          {(['Подсолнечник', 'Кукуруза'] as Crop[]).map((c) => (
            <button key={c} onClick={() => onPick(c)} className="group rounded-2xl border border-line hover:border-brand p-6 text-left transition">
              <div className="w-12 h-12 rounded-xl grid place-items-center mb-3" style={{ background: CROP_TINT[c] + '22', color: CROP_TINT[c] }}>{c === 'Кукуруза' ? <Wheat size={24} /> : <Sun size={24} />}</div>
              <div className="font-bold text-ink text-lg">{c}</div>
              <div className="text-xs text-muted mt-1">{c === 'Кукуруза' ? 'ДКС / DEKALB · ФАО, холодостойкость, фикс/флекс' : 'Genesis и рынок · заразиха, масличность, Clearfield/Express'}</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-brand mt-3 group-hover:gap-2 transition-all">Подобрать <ChevronRight size={16} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OptionStep({ title, opts, value, onPick }: { title: string; opts: Opt[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="mt-5">
      <div className="text-lg font-semibold text-ink mb-3">{title}</div>
      <div className="space-y-3 max-w-xl">
        {opts.map((o) => {
          const I = o.icon
          return (
            <div key={o.v}>
              <button onClick={() => onPick(o.v)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition ${value === o.v ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand/50'}`}>
                <I size={20} className="text-muted shrink-0" />
                <span className="font-medium text-ink">{o.label}</span>
                {value === o.v && <Check size={16} className="text-brand ml-auto" />}
              </button>
              {o.sub && <div className="text-xs text-muted mt-1 ml-1">{o.sub}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── результаты + фильтры ──
type Group = { key: string; label: string; valueOf: (h: CatalogHybrid) => string }
function groupsFor(crop: Crop): Group[] {
  if (crop === 'Кукуруза') return [
    { key: 'Засухоустойчивость', label: 'Засухоустойчивость', valueOf: (h) => scaleLabel(h.drought) },
    { key: 'Холодостойкость', label: 'Холодостойкость', valueOf: (h) => scaleLabel(h.cold || 0) },
    { key: 'Влагоотдача', label: 'Влагоотдача', valueOf: (h) => scaleLabel(h.moisture || 0) },
    { key: 'Ремонтантность', label: 'Ремонтантность', valueOf: (h) => scaleLabel(h.remont || 0) },
    { key: 'Реакция на загущение', label: 'Реакция на загущение', valueOf: (h) => h.density },
  ]
  return [
    { key: 'Засухоустойчивость', label: 'Засухоустойчивость', valueOf: (h) => scaleLabel(h.drought) },
    { key: 'Заразиха', label: 'Устойчивость к заразихе', valueOf: (h) => h.broomrape || '—' },
    { key: 'Масличность', label: 'Масличность', valueOf: (h) => (h.oil || 0) >= 50 ? 'высокая (≥50%)' : 'средняя' },
    { key: 'Болезни', label: 'Устойчивость к болезням', valueOf: (h) => scaleLabel(Math.round(((h.diseases?.lmr || 0) + (h.diseases?.phomopsis || 0) + (h.diseases?.sclerotinia || 0)) / 3)) },
    { key: 'Реакция на загущение', label: 'Реакция на загущение', valueOf: (h) => h.density },
  ]
}

function Results({ crop, ans, onPassport, onRequest, onVideo }: { crop: Crop; ans: Answers; onPassport: (h: CatalogHybrid) => void; onRequest: (h: CatalogHybrid) => void; onVideo: (h: CatalogHybrid) => void }) {
  const { catalogFor } = useCatalog()
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const groups = groupsFor(crop)

  const candidates = useMemo(() => {
    if (!ans.region) return []
    let list = catalogFor(crop, ans.region)
    if (ans.purpose) list = list.filter((h) => h.purpose.includes(ans.purpose!))
    if (crop === 'Подсолнечник' && ans.herb) list = list.filter((h) => h.herbTech === ans.herb)
    return list
  }, [crop, ans.region, ans.purpose, ans.herb, catalogFor])

  const shown = candidates.filter((h) => groups.every((g) => !filters[g.key]?.length || filters[g.key].includes(g.valueOf(h))))
  const toggle = (gk: string, v: string) => setFilters((f) => { const cur = f[gk] || []; return { ...f, [gk]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } })

  if (!ans.region) return <div className="mt-6 text-sm text-muted">Сначала выберите регион.</div>

  return (
    <div className="mt-5">
      <div className="flex gap-6">
        {/* filters */}
        <div className="w-52 shrink-0">
          {groups.map((g) => {
            const opts = [...new Set(candidates.map((h) => g.valueOf(h)))]
            return (
              <div key={g.key} className="mb-4">
                <div className="font-semibold text-ink text-sm mb-1.5">{g.label}</div>
                {opts.map((o) => (
                  <label key={o} className="flex items-center gap-2 py-0.5 text-sm text-ink cursor-pointer">
                    <input type="checkbox" checked={!!filters[g.key]?.includes(o)} onChange={() => toggle(g.key, o)} className="accent-brand" />
                    {o}
                  </label>
                ))}
              </div>
            )
          })}
        </div>

        {/* table */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted mb-2">Найдено гибридов: <b className="text-ink">{shown.length}</b> · регион {ans.region}</div>
          <div className="divide-y divide-line border-y border-line">
            {shown.map((h) => (
              <HybridRow key={h.id} h={h} crop={crop} region={ans.region!} onPassport={() => onPassport(h)} onRequest={() => onRequest(h)} onVideo={() => onVideo(h)} />
            ))}
            {!shown.length && <div className="py-8 text-center text-sm text-muted">Нет гибридов под выбранные фильтры.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function HybridRow({ h, crop, region, onPassport, onRequest, onVideo }: { h: CatalogHybrid; crop: Crop; region: string; onPassport: () => void; onRequest: () => void; onVideo: () => void }) {
  const { offers } = useCatalog()
  const tv = trialAvg(h.id, region)
  const offer = offers.find((o) => o.crop === crop && o.region === region && o.hybridIds.includes(h.id))
  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl shrink-0 grid place-items-center" style={{ background: CROP_TINT[crop] + '22', color: CROP_TINT[crop] }}>{crop === 'Кукуруза' ? <Wheat size={22} /> : <Sun size={22} />}</div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onPassport}>
          <div className="font-bold text-ink">{h.name} <span className="text-xs text-muted font-normal">· {h.brand}</span></div>
          <div className="text-xs text-muted mt-0.5 max-w-md">{h.desc}</div>
          {tv && <div className="text-xs text-ok mt-1">проверено полем: {tv.yield} ц/га на {tv.fields} полях ({region}) · +{tv.edge} к контролю</div>}
          <div className="mt-1"><RatingBadge id={h.id} kind="seed" /></div>
          {offer && <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand bg-brand-soft px-2 py-0.5 rounded-md">предложение семеновода: {offer.pricePerPU.toLocaleString('ru-RU')} ₽/п.е.{offer.discountPct > 0 && ` · −${offer.discountPct}%`}{offer.riskShare && ' · риск-шеринг'}</div>}
        </div>
        {/* params */}
        <div className="flex items-center gap-4 text-sm text-ink shrink-0">
          {crop === 'Кукуруза'
            ? <><Col t="ФАО" v={String(h.fao)} /><Col t="Засух" v={String(h.drought)} /><Col t="Холод" v={String(h.cold)} /><Col t="Влагоотд" v={String(h.moisture)} /><Col t="Ремонт" v={String(h.remont)} /><Col t="Загущ" v={h.density} w /></>
            : <><Col t="Дни" v={String(h.vegDays)} /><Col t="Масл" v={`${h.oil}%`} /><Col t="Заразиха" v={h.broomrape || ''} w /><Col t="Засух" v={String(h.drought)} /><Col t="Загущ" v={h.density} w /></>}
        </div>
        <button onClick={onRequest} className="shrink-0 text-xs font-semibold text-brand border border-brand/40 rounded-lg px-3 py-2 hover:bg-brand-soft">Заявка</button>
      </div>
      {h.video && <button onClick={onVideo} className="flex items-center gap-1.5 text-xs text-[#e8456b] mt-2 ml-16 hover:underline"><PlayCircle size={14} />Смотреть технологический ролик о гибриде</button>}
    </div>
  )
}
function Col({ t, v, w }: { t: string; v: string; w?: boolean }) {
  return <div className={`text-center ${w ? 'w-20' : 'w-12'}`}><div className="text-[10px] text-muted leading-tight">{t}</div><div className="font-semibold">{v}</div></div>
}

// ── Паспорт гибрида: параметры + испытания по регионам + график ──
function Passport({ h, region, onClose, onRequest }: { h: CatalogHybrid; region?: string; onClose: () => void; onRequest: () => void }) {
  const trials = trialsFor(h.id)
  const byRegion = [...new Set(trials.map((t) => t.region))].map((r) => { const a = trialAvg(h.id, r)!; return { region: r.replace(/ обл\.| край/, ''), yield: a.yield } })
  const totalFields = trials.reduce((s, t) => s + t.fields, 0)
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <div><div className="font-bold text-ink">{h.name} <span className="text-xs text-muted font-normal">· {h.brand} · {h.crop}</span></div><div className="text-xs text-muted">{h.desc}</div></div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto scroll-thin">
          {/* params */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {h.crop === 'Кукуруза'
              ? <><P k="ФАО" v={String(h.fao)} /><P k="Засухоустойчивость" v={`${h.drought}/9 · ${scaleLabel(h.drought)}`} /><P k="Холодостойкость" v={`${h.cold}/9`} /><P k="Влагоотдача" v={`${h.moisture}/9`} /><P k="Ремонтантность" v={`${h.remont}/9`} /><P k="Реакция на загущение" v={h.density} /></>
              : <><P k="Группа спелости" v={`${h.maturity} · ${h.vegDays} дн`} /><P k="Гербицид. система" v={h.herbTech || ''} /><P k="Заразиха" v={h.broomrape || ''} /><P k="Масличность" v={`${h.oil}%`} /><P k="Засухоустойчивость" v={`${h.drought}/9`} /><P k="Реакция на загущение" v={h.density} /></>}
          </div>
          {h.diseases && <div className="grid grid-cols-3 gap-2 mb-4"><P k="ЛМР" v={`${h.diseases.lmr}/9`} /><P k="Фомопсис" v={`${h.diseases.phomopsis}/9`} /><P k="Склеротиния" v={`${h.diseases.sclerotinia}/9`} /></div>}

          <div className="text-sm font-semibold text-ink mb-2">Урожайность по регионам (среднее по испытаниям), ц/га</div>
          <div className="h-44 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRegion} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="region" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="yield" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                  {byRegion.map((b, i) => <Cell key={i} fill={region && region.startsWith(b.region) ? '#fc3f1d' : '#cfd6d1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-sm font-semibold text-ink mb-2">Статистика проверки на полях ({totalFields} полей)</div>
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line bg-canvas/50">
                <th className="text-left font-medium p-2">Регион · год</th>
                <th className="text-right font-medium p-2 whitespace-nowrap w-16">Урожай</th>
                <th className="text-right font-medium p-2 whitespace-nowrap w-20">vs&nbsp;контроль</th>
                <th className="text-right font-medium p-2 w-12">Поля</th>
                <th className="text-left font-medium p-2 pl-4 w-36">Условия</th>
              </tr></thead>
              <tbody>
                {trials.map((t, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="p-2"><div className="text-ink">{t.region.replace(/ обл\.| край/, '')}</div><div className="text-[11px] text-muted">{t.year} · осадки {t.rainfall} мм · Σt {t.activeTemp}°</div></td>
                    <td className="p-2 text-right font-bold text-ink">{t.yield}</td>
                    <td className="p-2 text-right font-semibold" style={{ color: t.yield >= t.competitorYield ? '#2da84f' : '#e0900a' }}>{t.yield >= t.competitorYield ? '+' : ''}{Math.round((t.yield - t.competitorYield) * 10) / 10}</td>
                    <td className="p-2 text-right text-muted">{t.fields}</td>
                    <td className="p-2 pl-4 text-xs text-muted">{t.note}<br /><span className="text-[10px]">{t.soil}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5"><Reviews id={h.id} kind="seed" /></div>
        </div>
        <div className="px-5 py-3 border-t border-line flex justify-end gap-2">
          <button onClick={onClose} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold">Закрыть</button>
          <button onClick={onRequest} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Оставить заявку семеноводу</button>
        </div>
      </div>
    </div>
  )
}
function P({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-canvas p-2.5"><div className="text-[11px] text-muted">{k}</div><div className="font-semibold text-ink text-sm">{v}</div></div>
}

function VideoModal({ h, onClose }: { h: CatalogHybrid; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1001] grid place-items-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line"><div className="font-bold text-ink">Тех-ролик · {h.name} <span className="text-xs text-muted font-normal">· {h.brand}</span></div><button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button></div>
        {/* постер-заглушка ролика */}
        <div className="aspect-video grid place-items-center relative" style={{ background: `linear-gradient(150deg, ${CROP_TINT[h.crop]}, ${CROP_TINT[h.crop]}66)` }}>
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-lg"><PlayCircle size={34} className="text-[#e8456b]" /></div>
          <div className="absolute bottom-3 left-4 text-white/90 text-sm font-semibold">Демо-ролик · агротехнология и испытания сезона</div>
        </div>
        <div className="p-4 text-xs text-muted">Видео-материал гибрида (демо-плейсхолдер): закладка нормы высева, фенофазы, результаты делянок по регионам.</div>
      </div>
    </div>
  )
}

function RequestModal({ h, region, onClose }: { h: CatalogHybrid; region: string; onClose: () => void }) {
  const { submitRequest } = useCatalog()
  const [area, setArea] = useState('300')
  const [done, setDone] = useState(false)
  const send = () => { submitRequest({ agronom: AGRONOM, farm: FARM, crop: h.crop, region, hybridId: h.id, hybridName: h.name, areaHa: parseInt(area) || 0 }); setDone(true) }
  return (
    <div className="fixed inset-0 z-[1001] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line"><div className="font-bold text-ink">Заявка семеноводу</div><button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button></div>
        <div className="p-5">
          {done
            ? <div className="text-center py-4"><div className="w-12 h-12 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto mb-2"><Check size={22} /></div><div className="font-bold text-ink">Заявка отправлена Genesis</div><div className="text-sm text-muted mt-1">{h.name} · {region} · {area} га. Семеновод свяжется и предложит демо.</div><button onClick={onClose} className="mt-4 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Готово</button></div>
            : <>
              <div className="text-sm text-muted mb-3">Гибрид <b className="text-ink">{h.name}</b> ({h.brand}) для <b className="text-ink">{region}</b>. Хозяйство «{FARM}», агроном {AGRONOM}.</div>
              <label className="block text-xs font-semibold text-muted mb-1">Площадь сева, га</label>
              <input value={area} onChange={(e) => setArea(e.target.value)} type="number" className="w-full px-3 py-2.5 rounded-xl bg-white border border-line text-sm mb-4" />
              <button onClick={send} className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-semibold">Отправить заявку</button>
            </>}
        </div>
      </div>
    </div>
  )
}
