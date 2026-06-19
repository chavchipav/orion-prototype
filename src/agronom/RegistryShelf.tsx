import { useState } from 'react'
import { REG_SZR, REG_FERT, REG_COUNTS } from '../registryData'
import { useMarket } from '../marketStore'
import { fieldTested } from '../fieldTrace'
import { Search, Star, Check, FlaskConical, Droplets, Database, BadgeCheck, MessageSquare, Info } from 'lucide-react'
import { hash } from '../utils'

const FARM = 'Агрофирма «Заря»', AGRONOM = 'Виктор Степанович', REGION = 'Ростовская обл.'
const CROP_COLOR: Record<string, string> = { 'Подсолнечник': '#b653b0', 'Кукуруза': '#e0a92b', 'Соя': '#3f7fd6', 'Пшеница': '#2e9e57', 'Ячмень': '#cdbb3a', 'Горох': '#5fc7c2' }
const CROPS = ['Подсолнечник', 'Кукуруза', 'Соя', 'Пшеница', 'Ячмень', 'Горох']

type Item = { cat: 'СЗР' | 'Удобрения'; name: string; type: string; ai: string; crop: string; detail: string }
const ITEMS: Item[] = [
  ...REG_SZR.map((s) => ({ cat: 'СЗР' as const, name: s.name, type: s.type, ai: s.ai, crop: s.crop, detail: s.target })),
  ...REG_FERT.map((f) => ({ cat: 'Удобрения' as const, name: f.name, type: f.group || 'Удобрение', ai: f.npk ? `NPK ${f.npk}` : '', crop: f.crop, detail: f.dose })),
]

// Отзывы фермеров (community-слой) — детерминированный демо. Это НЕ бейдж
// «field-tested»: бейдж выдаётся отдельно и только при прослеживаемом следе (fieldTrace).
function reviewsOf(name: string) {
  const h = hash(name) >>> 0
  const rating = Number((4.0 + ((h >>> 5) % 10) / 10).toFixed(1)) // 4.0–4.9
  const reviews = 8 + ((h >>> 7) % 80)
  return { rating, reviews }
}

function Stars({ r }: { r: number }) {
  return <span className="inline-flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={11} className={i <= Math.round(r) ? 'text-warn fill-warn' : 'text-line'} />)}</span>
}

export function RegistryShelf() {
  const { submit } = useMarket()
  const [cat, setCat] = useState<'все' | 'СЗР' | 'Удобрения'>('все')
  const [crop, setCrop] = useState('все')
  const [q, setQ] = useState('')
  const [sent, setSent] = useState<Record<string, boolean>>({})

  const list = ITEMS.filter((x) => (cat === 'все' || x.cat === cat) && (crop === 'все' || x.crop === crop)
    && (!q || (x.name + x.ai + x.detail).toLowerCase().includes(q.toLowerCase())))

  const order = (x: Item) => { submit({ category: x.cat, product: x.name, brand: 'из госреестра', farm: FARM, agronom: AGRONOM, region: REGION, detail: `${x.type} · ${x.crop}` }); setSent((s) => ({ ...s, [x.name]: true })) }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Database size={19} className="text-brand" />Каталог из госреестра</h2>
          <p className="text-sm text-muted mt-0.5">Реальные препараты и удобрения из госреестров ({(REG_COUNTS.szr + REG_COUNTS.fert).toLocaleString('ru-RU')} записей). Бейдж <b className="text-ok">«проверено на платформе»</b> — только при прослеживаемом следе из наших опытов; остальное — отзывы фермеров.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-line rounded-xl w-60">
          <Search size={15} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по каталогу…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(['все', 'СЗР', 'Удобрения'] as const).map((c) => <button key={c} onClick={() => setCat(c)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${cat === c ? 'bg-brand text-white border-brand' : 'bg-white border-line text-muted hover:text-ink'}`}>{c}</button>)}
        <span className="w-px bg-line mx-1" />
        {['все', ...CROPS].map((c) => <button key={c} onClick={() => setCrop(c)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${crop === c ? 'bg-ink text-white border-ink' : 'bg-white border-line text-muted hover:text-ink'}`}>{c}</button>)}
      </div>

      <div className="text-xs text-muted mb-2">Найдено <b className="text-ink">{list.length}</b> позиций.</div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.slice(0, 60).map((x, i) => {
          const rv = reviewsOf(x.name)
          const ft = fieldTested(x)
          const Icon = x.cat === 'СЗР' ? FlaskConical : Droplets
          return (
            <div key={x.cat + x.name + i} className="bg-white border border-line rounded-2xl p-4 flex flex-col">
              <div className="flex items-start gap-2.5">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-white shrink-0" style={{ background: x.cat === 'СЗР' ? '#2b6def' : '#7c5cff' }}><Icon size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink leading-tight">{x.name}</div>
                  <div className="text-[11px] text-muted">{x.type}</div>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-muted shrink-0"><i className="w-2 h-2 rounded-full" style={{ background: CROP_COLOR[x.crop] || '#999' }} />{x.crop}</span>
              </div>
              {x.ai && <div className="text-[11px] text-muted mt-2">{x.ai}</div>}
              <div className="text-[11px] text-muted mt-0.5 line-clamp-2">{x.detail}</div>

              {/* честный слой: бейдж field-tested ТОЛЬКО при прослеживаемом следе */}
              {ft.tested ? (
                <div className="mt-2.5 rounded-xl bg-ok-soft/50 border border-ok/20 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ok">
                    <BadgeCheck size={14} />проверено на платформе
                    <span title={`Источник бейджа: опыт «${ft.trialName}» (${ft.crop}, поле ${ft.field}, ${ft.year}). Двухфакторный разбор дисперсии по делянкам — драйвер ${ft.driverPct}% вклада. Не реклама вендора.`} className="ml-auto text-muted/70 hover:text-muted cursor-help"><Info size={12} /></span>
                  </div>
                  <div className="text-[11px] text-ink mt-1">на основе {ft.trials} опыта · {ft.plots} делянок · <b className="text-ok">+{ft.deltaT} т/га</b> к контролю</div>
                  <div className="text-[10px] text-muted mt-0.5">{ft.basis} · {ft.crop}, {ft.field}, {ft.year}</div>
                </div>
              ) : (
                <div className="mt-2.5 rounded-xl bg-canvas px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><MessageSquare size={13} />отзывы фермеров</div>
                  <div className="text-[10px] text-muted mt-0.5">опытных данных на платформе пока нет — оценка по отзывам, не доказательство</div>
                </div>
              )}
              {/* community-рейтинг (отзывы) — отдельно от бейджа */}
              <div className="flex items-center gap-1.5 text-xs text-ink mt-1.5"><Stars r={rv.rating} /><b>{rv.rating}</b><span className="text-muted">· {rv.reviews} отзывов фермеров</span></div>

              <div className="flex-1" />
              <button onClick={() => order(x)} disabled={sent[x.name]} className={`mt-3 w-full rounded-xl py-2 text-sm font-semibold ${sent[x.name] ? 'bg-ok-soft text-ok' : 'bg-brand text-white hover:brightness-105'}`}>
                {sent[x.name] ? <span className="inline-flex items-center gap-1"><Check size={14} />Заявка отправлена</span> : 'Оставить заявку'}
              </button>
            </div>
          )
        })}
      </div>
      {!list.length && <div className="text-sm text-muted py-8 text-center">Ничего не найдено — измените фильтры.</div>}
    </div>
  )
}
