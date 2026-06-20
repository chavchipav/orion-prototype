import { useState } from 'react'
import { SZR_CATALOG, SZR_CROPS, SZR_MARKERS, SZR_PHASES, szrTrialsFor, szrTrialAvg, type SzrProduct, type SzrType } from '../szrData'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Reviews, RatingBadge } from '../components/Reviews'
import { useMarket } from '../marketStore'

const AGRONOM = 'Виктор Степанович', FARM = 'Агрофирма «Заря»', REGION = 'Ростовская обл.'
import { ChevronRight, ChevronLeft, Sun, Droplets, Sprout, FlaskConical, Bug, ShieldCheck, PlayCircle, X, Check, Leaf } from 'lucide-react'

const TYPE_OPTS: { v: SzrType; icon: typeof Bug; sub: string }[] = [
  { v: 'Гербицид', icon: Leaf, sub: 'контроль сорняков' },
  { v: 'Фунгицид', icon: ShieldCheck, sub: 'защита от болезней' },
  { v: 'Инсектицид', icon: Bug, sub: 'защита от вредителей' },
]
const CROP_TINT: Record<string, string> = { 'Кукуруза': '#7aa53a', 'Подсолнечник': '#e0a92b', 'Озимая пшеница': '#2e9e57' }
type Ans = { irrigation?: string; type?: SzrType; phase?: string; markers: string[] }
const ORDER = ['irrigation', 'type', 'phase', 'markers', 'results']
const TITLE: Record<string, string> = { irrigation: 'Орошение / зона увлажнения', type: 'Тип защиты', phase: 'Фаза культуры', markers: 'Маркерные проблемы' }

export function SzrSelector() {
  const [crop, setCrop] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [ans, setAns] = useState<Ans>({ markers: [] })
  const [passport, setPassport] = useState<SzrProduct | null>(null)
  const [video, setVideo] = useState<SzrProduct | null>(null)

  if (!crop) return <CropPick onPick={(c) => { setCrop(c); setIdx(0); setAns({ markers: [] }) }} />

  const total = ORDER.length
  const stepKey = ORDER[idx]
  const percent = Math.round((idx / (total - 1)) * 100)
  const set = (k: keyof Ans, v: string) => { setAns((a) => ({ ...a, [k]: v })); setIdx((i) => Math.min(i + 1, total - 1)) }
  const toggleMarker = (m: string) => setAns((a) => ({ ...a, markers: a.markers.includes(m) ? a.markers.filter((x) => x !== m) : [...a.markers, m] }))

  const products = SZR_CATALOG.filter((p) => p.crops.includes(crop) && (!ans.type || p.type === ans.type)
    && (!ans.phase || p.phases.includes(ans.phase)) && (!ans.markers.length || p.target.some((t) => ans.markers.includes(t))))

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="bg-white border border-line rounded-2xl shadow-sm max-w-6xl mx-auto">
        <div className="flex">
          <div className="flex-1 min-w-0 p-7">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-ink">Подберите СЗР для посевов {crop === 'Кукуруза' ? 'кукурузы' : crop === 'Подсолнечник' ? 'подсолнечника' : 'озимой пшеницы'}</h2>
              <button onClick={() => setCrop(null)} className="text-xs text-muted hover:text-ink">сменить культуру</button>
            </div>

            {stepKey === 'irrigation' && <OptStep title={TITLE.irrigation} opts={[{ v: 'Нет', label: 'Нет', sub: 'богара', icon: Sun }, { v: 'Да', label: 'Да', sub: 'орошение / достаточное увлажнение', icon: Droplets }]} value={ans.irrigation} onPick={(v) => set('irrigation', v)} />}
            {stepKey === 'type' && <OptStep title={TITLE.type} opts={TYPE_OPTS.map((t) => ({ v: t.v, label: t.v, sub: t.sub, icon: t.icon }))} value={ans.type} onPick={(v) => set('type', v)} />}
            {stepKey === 'phase' && <OptStep title={TITLE.phase} opts={SZR_PHASES[crop].map((p) => ({ v: p, label: p, icon: Sprout }))} value={ans.phase} onPick={(v) => set('phase', v)} />}
            {stepKey === 'markers' && (
              <div className="mt-5">
                <div className="text-lg font-semibold text-ink mb-1">{TITLE.markers}</div>
                <div className="text-xs text-muted mb-3">Отметьте, что нужно контролировать (можно несколько) — подберём продукт под спектр.</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                  {(ans.type ? SZR_MARKERS[ans.type] : []).map((m) => (
                    <label key={m} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm cursor-pointer ${ans.markers.includes(m) ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand/50'}`}>
                      <input type="checkbox" checked={ans.markers.includes(m)} onChange={() => toggleMarker(m)} className="accent-brand" />{m}
                    </label>
                  ))}
                </div>
                <button onClick={() => setIdx(total - 1)} className="mt-4 bg-brand text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Подобрать СЗР →</button>
              </div>
            )}
            {stepKey === 'results' && <Results crop={crop} products={products} onPassport={setPassport} onVideo={setVideo} />}

            <div className="flex items-center gap-3 mt-7">
              {idx > 0 && <button onClick={() => setIdx((i) => i - 1)} className="flex items-center gap-2 bg-[#e8456b] text-white font-bold text-sm rounded-md pl-5 pr-3 py-2.5"><span className="tracking-wide">НАЗАД</span><span className="bg-white text-[#e8456b] rounded grid place-items-center w-6 h-6"><ChevronLeft size={16} /></span></button>}
            </div>
          </div>

          <aside className="w-64 shrink-0 border-l border-line p-6">
            <div className="text-sm text-muted pb-3 border-b border-line">Шаг {idx + 1} из {total}</div>
            {(['irrigation', 'type', 'phase'] as (keyof Ans)[]).map((k) => ans[k] && (
              <div key={k} className="py-3 border-b border-line"><div className="text-xs text-muted">{TITLE[k]}</div><div className="font-bold text-ink">{ans[k] as string}</div></div>
            ))}
            {ans.markers.length > 0 && <div className="py-3 border-b border-line"><div className="text-xs text-muted">Маркеры</div><div className="font-bold text-ink text-sm">{ans.markers.length} выбрано</div></div>}
            <div className="pt-4">
              <div className="text-sm text-muted">СЗР подобрано</div>
              <div className="font-bold text-ink mb-2">{percent}%</div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-[#9bd35a] rounded-full transition-all" style={{ width: `${Math.max(6, percent)}%` }} /></div>
            </div>
          </aside>
        </div>
      </div>

      {passport && <Passport p={passport} crop={crop} onClose={() => setPassport(null)} onVideo={() => { setVideo(passport); setPassport(null) }} />}
      {video && <VideoModal p={video} onClose={() => setVideo(null)} />}
    </div>
  )
}

function CropPick({ onPick }: { onPick: (c: string) => void }) {
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="bg-white border border-line rounded-2xl shadow-sm max-w-3xl mx-auto p-8">
        <h2 className="text-xl font-bold text-ink mb-1">Подбор СЗР</h2>
        <p className="text-sm text-muted mb-6">Подберите эффективное средство защиты под культуру, фазу и спектр проблем — на основе полевых опытов.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SZR_CROPS.map((c) => (
            <button key={c} onClick={() => onPick(c)} className="group rounded-2xl border border-line hover:border-brand p-5 text-left transition">
              <div className="w-11 h-11 rounded-xl grid place-items-center mb-3" style={{ background: CROP_TINT[c] + '22', color: CROP_TINT[c] }}><FlaskConical size={22} /></div>
              <div className="font-bold text-ink">{c}</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-brand mt-2 group-hover:gap-2 transition-all">Подобрать <ChevronRight size={15} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

type Opt = { v: string; label: string; sub?: string; icon: typeof Sun }
function OptStep({ title, opts, value, onPick }: { title: string; opts: Opt[]; value?: string; onPick: (v: string) => void }) {
  return (
    <div className="mt-5">
      <div className="text-lg font-semibold text-ink mb-3">{title}</div>
      <div className="space-y-3 max-w-xl">
        {opts.map((o) => { const I = o.icon; return (
          <button key={o.v} onClick={() => onPick(o.v)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition ${value === o.v ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand/50'}`}>
            <I size={20} className="text-muted shrink-0" /><span className="font-medium text-ink">{o.label}</span>{o.sub && <span className="text-xs text-muted">· {o.sub}</span>}{value === o.v && <Check size={16} className="text-brand ml-auto" />}
          </button>
        ) })}
      </div>
    </div>
  )
}

function Results({ crop, products, onPassport, onVideo }: { crop: string; products: SzrProduct[]; onPassport: (p: SzrProduct) => void; onVideo: (p: SzrProduct) => void }) {
  return (
    <div className="mt-5">
      <div className="text-xs text-muted mb-2">Подходящих продуктов: <b className="text-ink">{products.length}</b></div>
      <div className="divide-y divide-line border-y border-line">
        {products.map((p) => {
          const tv = szrTrialAvg(p.id, crop)
          return (
            <div key={p.id} className="py-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-14 rounded-lg shrink-0 grid place-items-center text-white" style={{ background: `linear-gradient(160deg,#2b6def,#2b6defaa)` }}><FlaskConical size={20} /></div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPassport(p)}>
                  <div className="font-bold text-ink">{p.name} <span className="text-xs text-muted font-normal">· {p.brand} · {p.type}</span></div>
                  <div className="text-xs text-muted mt-0.5 max-w-lg">{p.desc}</div>
                  <div className="text-[11px] text-muted mt-1">д.в.: {p.ai} · норма {p.norm} {p.unit} · {p.schema.toLowerCase()}</div>
                  {tv && <div className="text-xs text-ok mt-1">проверено полем: прибавка +{tv.gain} ц/га на {tv.fields} полях ({crop})</div>}
                  <div className="mt-1"><RatingBadge id={p.id} kind="szr" /></div>
                </div>
                <button onClick={() => onPassport(p)} className="shrink-0 text-xs font-semibold text-brand border border-brand/40 rounded-lg px-3 py-2 hover:bg-brand-soft">Подробнее</button>
              </div>
              {p.video && <button onClick={() => onVideo(p)} className="flex items-center gap-1.5 text-xs text-[#e8456b] mt-2 ml-16 hover:underline"><PlayCircle size={14} />Смотреть ролик о продукте</button>}
            </div>
          )
        })}
        {!products.length && <div className="py-8 text-center text-sm text-muted">Нет продуктов под выбранные условия — измените фазу/маркеры.</div>}
      </div>
    </div>
  )
}

function Passport({ p, crop, onClose, onVideo }: { p: SzrProduct; crop: string; onClose: () => void; onVideo: () => void }) {
  const { submit } = useMarket()
  const [sent, setSent] = useState(false)
  const send = () => { submit({ category: 'СЗР', product: p.name, brand: p.brand, farm: FARM, agronom: AGRONOM, region: REGION, detail: `${p.type} · ${crop}` }); setSent(true) }
  const trials = szrTrialsFor(p.id).filter((t) => t.crop === crop)
  const all = szrTrialsFor(p.id)
  const rows = (trials.length ? trials : all)
  const avgTreated = Math.round((rows.reduce((s, t) => s + t.treated, 0) / rows.length) * 10) / 10
  const avgControl = Math.round((rows.reduce((s, t) => s + t.control, 0) / rows.length) * 10) / 10
  const avgGain = Math.round((avgTreated - avgControl) * 10) / 10
  const donut = [{ name: 'контроль', value: avgControl }, { name: 'прибавка', value: avgGain }]
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <div><div className="font-bold text-ink">{p.name} <span className="text-xs text-muted font-normal">· {p.brand} · {p.type}</span></div><div className="text-xs text-muted">{p.desc}</div></div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto scroll-thin">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <P k="Действующее вещество" v={p.ai} wide />
            <P k="Норма" v={`${p.norm} ${p.unit}`} /><P k="Схема" v={p.schema} /><P k="Фаза" v={p.phases.join(', ')} />
            <P k="Класс опасности" v={`${p.hazard}`} /><P k="Срок ожидания" v={`${p.waitDays} дн`} /><P k="Контролирует" v={p.target.join(', ')} wide />
          </div>

          {/* урожайность + прибавка */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl border border-line p-4">
              <div className="text-sm font-semibold text-ink mb-2">Урожайность, ц/га</div>
              <div className="space-y-2">
                <Bar label="Вариант хозяйства (контроль)" v={avgControl} max={avgTreated} color="#bcbcc4" />
                <Bar label={p.name} v={avgTreated} max={avgTreated} color="#9bd35a" />
              </div>
            </div>
            <div className="rounded-xl border border-line p-4 flex items-center gap-3">
              <div className="w-24 h-24 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={donut} dataKey="value" innerRadius={30} outerRadius={42} startAngle={90} endAngle={-270} isAnimationActive={false}><Cell fill="#e5e7eb" /><Cell fill="#2da84f" /></Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-[10px] text-muted">прибавка</div><div className="text-sm font-extrabold text-ink">+{avgGain}</div></div></div>
              </div>
              <div className="text-sm text-muted">Средняя <b className="text-ink">прибавка +{avgGain} ц/га</b> к контролю по {rows.reduce((s, t) => s + t.fields, 0)} полям.</div>
            </div>
          </div>

          {/* результаты опытов */}
          <div className="text-sm font-semibold text-ink mb-2">Результаты полевых опытов</div>
          <div className="rounded-xl border border-line overflow-hidden mb-3">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line bg-canvas/50"><th className="text-left font-medium p-2">Регион · год · культура</th><th className="text-right font-medium p-2">Продукт</th><th className="text-right font-medium p-2">Контроль</th><th className="text-right font-medium p-2">Прибавка</th><th className="text-left font-medium p-2 pl-3">Условия</th></tr></thead>
              <tbody>
                {all.map((t, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="p-2"><div className="text-ink">{t.region.replace(/ обл\.| край/, '')} · {t.year}</div><div className="text-[11px] text-muted">{t.crop} · {t.vs}</div></td>
                    <td className="p-2 text-right font-bold text-ink">{t.treated}</td>
                    <td className="p-2 text-right text-muted">{t.control}</td>
                    <td className="p-2 text-right font-semibold text-ok">+{t.gain}</td>
                    <td className="p-2 pl-3 text-xs text-muted">{t.note}<br /><span className="text-[10px]">{t.soil} · осадки {t.rainfall} мм</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* фотоотчёт */}
          <div className="text-sm font-semibold text-ink mb-2">Фотоотчёт с делянок</div>
          <div className="flex gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="w-40 shrink-0">
                <div className="h-24 rounded-lg grid place-items-center text-white text-xs" style={{ background: `linear-gradient(150deg,${CROP_TINT[crop]},${CROP_TINT[crop]}66)` }}>фото делянки</div>
                <div className="text-[11px] text-muted mt-1">{p.name}: {i === 0 ? 'обработанный участок' : 'контроль (без обработки)'}</div>
              </div>
            ))}
          </div>

          <div className="mt-5"><Reviews id={p.id} kind="szr" /></div>
        </div>
        <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">
          {sent && <span className="text-xs font-semibold text-ok flex items-center gap-1"><Check size={13} />Заявка дистрибьютору отправлена</span>}
          <button onClick={onClose} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold">Закрыть</button>
          {p.video && <button onClick={onVideo} className="bg-canvas text-ink rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"><PlayCircle size={14} />Ролик</button>}
          <button onClick={send} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Сохранить · заявка</button>
        </div>
      </div>
    </div>
  )
}
function P({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return <div className={`rounded-xl bg-canvas p-2.5 ${wide ? 'col-span-3' : ''}`}><div className="text-[11px] text-muted">{k}</div><div className="font-semibold text-ink text-sm">{v}</div></div>
}
function Bar({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  return <div><div className="flex justify-between text-xs mb-0.5"><span className="text-muted truncate">{label}</span><span className="font-semibold text-ink">{v} ц/га</span></div><div className="h-3 rounded bg-canvas overflow-hidden"><div className="h-full rounded" style={{ width: `${(v / max) * 100}%`, background: color }} /></div></div>
}

function VideoModal({ p, onClose }: { p: SzrProduct; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1001] grid place-items-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line"><div className="font-bold text-ink">Ролик · {p.name}</div><button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button></div>
        <div className="aspect-video grid place-items-center relative bg-gradient-to-br from-[#2b6def] to-[#2b6def66]">
          <div className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-lg"><PlayCircle size={34} className="text-[#e8456b]" /></div>
          <div className="absolute bottom-3 left-4 text-white/90 text-sm font-semibold">Демо-ролик · технология применения и опыты</div>
        </div>
      </div>
    </div>
  )
}
