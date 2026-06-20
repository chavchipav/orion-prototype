import { useState, type ReactNode } from 'react'
import { TECHCARDS, PREPARATIONS, type TechCard, type TechOp } from '../agronomData2'
import { CROP_COLORS } from '../agronomData'
import { Plus, SlidersHorizontal, Copy, CheckCircle2, X } from 'lucide-react'

const BLOCKS = ['Почвообработка', 'Сев', 'Защита растений', 'Питание', 'Уборка', 'Прочее']

export function Techcards() {
  const [selId, setSelId] = useState(TECHCARDS[0].id)
  const [op, setOp] = useState<TechOp | null>(null)
  const card = TECHCARDS.find((t) => t.id === selId)!

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-y-auto scroll-thin p-6">
        <h2 className="text-xl font-bold text-ink mb-1">Техкарты</h2>
        <p className="text-sm text-muted mb-4">Технологическая карта: <b className="text-ink">{card.name}</b> · назначьте на массив полей</p>
        <div className="space-y-3 max-w-3xl">
          {BLOCKS.map((b) => {
            const ops = card.ops.filter((o) => o.block === b)
            return (
              <div key={b} className="bg-white border border-line rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-canvas font-semibold text-ink text-sm flex items-center gap-2"><i className="w-2 h-2 rounded-full" style={{ background: CROP_COLORS[card.crop] }} />{b}</div>
                {ops.length === 0 ? <div className="px-4 py-3 text-xs text-muted">Операции пока не указаны</div> :
                  ops.map((o, i) => (
                    <button key={i} onClick={() => setOp(o)} className="w-full flex items-center justify-between px-4 py-3 border-t border-line hover:bg-canvas text-left">
                      <div>
                        <div className="font-medium text-ink text-sm">{o.name}{o.phase && <span className="text-muted font-normal"> · {o.phase}</span>}</div>
                        {o.products && <div className="text-xs text-muted mt-0.5">{o.products.map((p) => `${p.name} ${p.norm} ${p.unit}`).join(' · ')}</div>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${o.status === 'Факт' ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{o.status}</span>
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* right ТК list */}
      <aside className="w-72 shrink-0 border-l border-line bg-white flex flex-col">
        <div className="p-3 border-b border-line flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 bg-canvas hover:bg-brand-soft rounded-xl py-2 text-sm font-semibold"><Plus size={15} />Добавить ТК</button>
          <button className="flex items-center gap-1.5 bg-canvas rounded-xl py-2 px-3 text-sm font-semibold"><SlidersHorizontal size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {TECHCARDS.map((t) => (
            <button key={t.id} onClick={() => setSelId(t.id)} className={`w-full flex items-center gap-3 px-4 py-3 border-b border-line text-left hover:bg-canvas ${t.id === selId ? 'bg-brand-soft/40' : ''}`}>
              <i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[t.crop] }} />
              <div><div className="font-semibold text-ink text-sm">{t.name}</div><div className="text-xs text-muted">{t.crop}, {t.year}</div></div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Act icon={<Copy size={14} />} l="Копировать" /><Act icon={<CheckCircle2 size={14} />} l="Назначить" primary /><Act icon={<X size={14} />} l="Снять" />
        </div>
      </aside>

      {op && <OpModal card={card} op={op} onClose={() => setOp(null)} />}
    </div>
  )
}

function OpModal({ card, op, onClose }: { card: TechCard; op: TechOp; onClose: () => void }) {
  const [prods, setProds] = useState(op.products ?? [{ name: PREPARATIONS[0].name, norm: PREPARATIONS[0].norm, unit: PREPARATIONS[0].unit }])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-line font-bold text-ink">{op.block}, {card.name}</div>
        <div className="grid grid-cols-2 gap-5 p-5">
          <div className="space-y-3">
            <F label="Вид работ"><Inp v={op.name} /></F>
            <F label="Статус"><Inp v={op.status} /></F>
            <button className="text-sm font-semibold text-brand text-left">Задать интервал после предыдущей обработки</button>
            <F label="Дата начала"><Inp v="" placeholder="дд.мм.гггг" /></F>
            <F label="Фаза вегетации"><Inp v={op.phase || ''} placeholder="выберите фазу" /></F>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted">СЗР / удобрения</div>
            {prods.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={p.name} onChange={(e) => setProds(prods.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 px-2.5 py-2 rounded-lg bg-canvas text-sm outline-none">
                  {PREPARATIONS.map((pr) => <option key={pr.name}>{pr.name}</option>)}
                </select>
                <input value={p.norm} onChange={(e) => setProds(prods.map((x, j) => j === i ? { ...x, norm: +e.target.value } : x))} className="w-16 px-2 py-2 rounded-lg bg-canvas text-sm outline-none text-right" />
                <span className="text-xs text-muted w-10">{p.unit}</span>
                <button onClick={() => setProds(prods.filter((_, j) => j !== i))} className="text-risk"><X size={15} /></button>
              </div>
            ))}
            <button onClick={() => setProds([...prods, { name: PREPARATIONS[0].name, norm: PREPARATIONS[0].norm, unit: PREPARATIONS[0].unit }])} className="w-7 h-7 rounded-full bg-ok-soft text-ok grid place-items-center"><Plus size={15} /></button>
            <F label="Норма рабочего раствора, л/га"><Inp v="200" /></F>
          </div>
        </div>
        <div className="flex justify-start gap-2 px-5 pb-5">
          <button onClick={onClose} className="bg-brand text-white rounded-xl px-5 py-2.5 text-sm font-semibold">Сохранить</button>
          <button onClick={onClose} className="bg-canvas text-ink rounded-xl px-5 py-2.5 text-sm font-semibold">Отмена</button>
        </div>
      </div>
    </div>
  )
}

function F({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="block text-[11px] font-semibold text-muted mb-1">{label}</span>{children}</label> }
function Inp({ v, placeholder }: { v: string; placeholder?: string }) { return <input defaultValue={v} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-canvas text-sm outline-none" /> }
function Act({ icon, l, primary }: { icon: ReactNode; l: string; primary?: boolean }) {
  return <button className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-semibold ${primary ? 'bg-brand text-white' : 'bg-canvas text-ink'}`}>{icon}{l}</button>
}
