import { useState } from 'react'
import { type MCategory, type MProduct } from '../marketData'
import { Reviews, RatingBadge } from '../components/Reviews'
import { useMarket } from '../marketStore'
import { ChevronLeft, Check, PlayCircle, X, Droplets, Tractor, Cpu, Sparkles } from 'lucide-react'

const CAT_ICON: Record<string, typeof Droplets> = { fert: Droplets, tech: Tractor, soft: Cpu }
const AGRONOM = 'Виктор Степанович', FARM = 'Агрофирма «Заря»', REGION = 'Ростовская обл.'

export function CategorySelector({ cat }: { cat: MCategory }) {
  const stepKeys = [...cat.steps.map((s) => s.key), 'results']
  const [idx, setIdx] = useState(0)
  const [ans, setAns] = useState<Record<string, string>>({})
  const [passport, setPassport] = useState<MProduct | null>(null)
  const [video, setVideo] = useState<MProduct | null>(null)
  const total = stepKeys.length
  const percent = Math.round((idx / (total - 1)) * 100)
  const key = stepKeys[idx]
  const set = (k: string, v: string) => { setAns((a) => ({ ...a, [k]: v })); setIdx((i) => Math.min(i + 1, total - 1)) }
  const Icon = CAT_ICON[cat.key] || Droplets

  const products = cat.products
    .filter((p) => cat.steps.every((s) => !ans[s.key] || !p.tags[s.key] || p.tags[s.key].includes(ans[s.key])))
    .sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0))

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="bg-white border border-line rounded-2xl shadow-sm max-w-6xl mx-auto">
        <div className="flex">
          <div className="flex-1 min-w-0 p-7">
            <h2 className="text-xl font-bold text-ink mb-1">Подбор · {cat.label}</h2>

            {cat.steps.map((s) => key === s.key && (
              <div key={s.key} className="mt-5">
                <div className="text-lg font-semibold text-ink mb-3">{s.title}</div>
                <div className="space-y-3 max-w-xl">
                  {s.opts.map((o) => (
                    <button key={o.v} onClick={() => set(s.key, o.v)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition ${ans[s.key] === o.v ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand/50'}`}>
                      <Icon size={18} style={{ color: cat.tint }} className="shrink-0" /><span className="font-medium text-ink">{o.label}</span>{o.sub && <span className="text-xs text-muted">· {o.sub}</span>}{ans[s.key] === o.v && <Check size={16} className="text-brand ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {key === 'results' && (
              <div className="mt-5">
                <div className="text-xs text-muted mb-2">Подходящих позиций: <b className="text-ink">{products.length}</b></div>
                <div className="divide-y divide-line border-y border-line">
                  {products.map((p) => (
                    <div key={p.id} className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl shrink-0 grid place-items-center" style={{ background: cat.tint + '22', color: cat.tint }}>{p.ours ? <Sparkles size={20} /> : <Icon size={20} />}</div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPassport(p)}>
                          <div className="font-bold text-ink">{p.name} <span className="text-xs text-muted font-normal">· {p.brand}</span>{p.ours && <span className="ml-1.5 text-[10px] font-bold text-brand bg-brand-soft px-1.5 py-0.5 rounded">наш продукт</span>}</div>
                          <div className="text-xs text-muted mt-0.5 max-w-lg">{p.desc}</div>
                          <div className="text-xs text-ok mt-1">проверено полем: {p.proof[0].label.toLowerCase()} {p.proof[0].value}</div>
                          <div className="mt-1"><RatingBadge id={p.id} kind={cat.reviewKind} /></div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-sm text-ink shrink-0">
                          {p.rowCols.map((c, i) => <div key={i} className="text-center w-20"><div className="text-[10px] text-muted leading-tight">{c.t}</div><div className="font-semibold">{c.v}</div></div>)}
                          <div className="text-center w-24"><div className="text-[10px] text-muted">Цена</div><div className="font-semibold text-xs">{p.price}</div></div>
                        </div>
                        <button onClick={() => setPassport(p)} className="shrink-0 text-xs font-semibold text-brand border border-brand/40 rounded-lg px-3 py-2 hover:bg-brand-soft">Подробнее</button>
                      </div>
                      {p.video && <button onClick={() => setVideo(p)} className="flex items-center gap-1.5 text-xs text-[#e8456b] mt-2 ml-16 hover:underline"><PlayCircle size={14} />Смотреть ролик</button>}
                    </div>
                  ))}
                  {!products.length && <div className="py-8 text-center text-sm text-muted">Нет позиций под выбранные условия — измените параметры.</div>}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-7">
              {idx > 0 && <button onClick={() => setIdx((i) => i - 1)} className="flex items-center gap-2 bg-[#e8456b] text-white font-bold text-sm rounded-md pl-5 pr-3 py-2.5"><span className="tracking-wide">НАЗАД</span><span className="bg-white text-[#e8456b] rounded grid place-items-center w-6 h-6"><ChevronLeft size={16} /></span></button>}
            </div>
          </div>

          <aside className="w-64 shrink-0 border-l border-line p-6">
            <div className="text-sm text-muted pb-3 border-b border-line">Шаг {idx + 1} из {total}</div>
            {cat.steps.map((s) => ans[s.key] && (
              <div key={s.key} className="py-3 border-b border-line"><div className="text-xs text-muted">{s.title}</div><div className="font-bold text-ink text-sm">{s.opts.find((o) => o.v === ans[s.key])?.label}</div></div>
            ))}
            <div className="pt-4">
              <div className="text-sm text-muted">Подобрано</div>
              <div className="font-bold text-ink mb-2">{percent}%</div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-[#9bd35a] rounded-full transition-all" style={{ width: `${Math.max(6, percent)}%` }} /></div>
            </div>
          </aside>
        </div>
      </div>

      {passport && <Passport cat={cat} p={passport} onClose={() => setPassport(null)} onVideo={() => { setVideo(passport); setPassport(null) }} />}
      {video && <VideoModal cat={cat} p={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

function Passport({ cat, p, onClose, onVideo }: { cat: MCategory; p: MProduct; onClose: () => void; onVideo: () => void }) {
  const { submit } = useMarket()
  const [sent, setSent] = useState(false)
  const send = () => { submit({ category: cat.label, product: p.name, brand: p.brand, farm: FARM, agronom: AGRONOM, region: REGION, detail: p.rowCols.map((c) => `${c.t} ${c.v}`).join(' · ') }); setSent(true) }
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <div><div className="font-bold text-ink">{p.name} <span className="text-xs text-muted font-normal">· {p.brand}</span>{p.ours && <span className="ml-1.5 text-[10px] font-bold text-brand bg-brand-soft px-1.5 py-0.5 rounded">наш продукт</span>}</div><div className="text-xs text-muted">{p.desc}</div></div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto scroll-thin">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {p.params.map((x, i) => <div key={i} className="rounded-xl bg-canvas p-2.5"><div className="text-[11px] text-muted">{x.label}</div><div className="font-semibold text-ink text-sm">{x.value}</div></div>)}
            <div className="rounded-xl bg-canvas p-2.5"><div className="text-[11px] text-muted">Цена</div><div className="font-semibold text-ink text-sm">{p.price}</div></div>
          </div>

          <div className="text-sm font-semibold text-ink mb-2">{cat.proofTitle}</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {p.proof.map((x, i) => <div key={i} className="rounded-xl border border-line p-3 text-center"><div className="text-lg font-extrabold text-ink">{x.value}</div><div className="text-[11px] text-muted">{x.label}</div></div>)}
          </div>

          <div className="pt-4 border-t border-line"><Reviews id={p.id} kind={cat.reviewKind} /></div>
        </div>
        <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">
          {sent && <span className="text-xs font-semibold text-ok flex items-center gap-1"><Check size={13} />Заявка дистрибьютору отправлена</span>}
          <button onClick={onClose} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold">Закрыть</button>
          {p.video && <button onClick={onVideo} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"><PlayCircle size={14} />Ролик</button>}
          <button onClick={send} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Оставить заявку</button>
        </div>
      </div>
    </div>
  )
}

function VideoModal({ cat, p, onClose }: { cat: MCategory; p: MProduct; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1001] grid place-items-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line"><div className="font-bold text-ink">Ролик · {p.name}</div><button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button></div>
        <div className="aspect-video grid place-items-center relative" style={{ background: `linear-gradient(150deg, ${cat.tint}, ${cat.tint}66)` }}>
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-lg"><PlayCircle size={34} className="text-[#e8456b]" /></div>
          <div className="absolute bottom-3 left-4 text-white/90 text-sm font-semibold">Демо-ролик · {cat.label.toLowerCase()}</div>
        </div>
      </div>
    </div>
  )
}
