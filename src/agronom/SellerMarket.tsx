import { useMemo, useState } from 'react'
import { useMarket } from '../marketStore'
import { useApp } from '../store'
import { useC2C } from '../c2cStore'
import { FARM } from '../agronomData'
import {
  SELLERS, LISTINGS, GOODS_CATS, SERVICE_CATS, sellerById, priceLabel,
  type Listing, type Seller,
} from '../sellerData'
import { AD_CATS, type Ad, type AdType } from '../c2cData'
import { Modal, Field, Input, Select } from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  Store, Tractor, Wrench, Sprout, Droplets, FlaskConical, Wheat, Eye, Truck, Boxes,
  FileText, Scale, Heart, MessageSquare, ShoppingCart, Check, ShieldCheck, Star,
  Percent, ChevronDown, Sparkles, X, Plus, MapPin, Users,
} from 'lucide-react'

const AD_TONE: Record<AdType, string> = { 'продам': 'bg-ok-soft text-ok', 'куплю': 'bg-sky-soft text-sky', 'услуга': 'bg-brand-soft text-brand' }

const CAT_ICON: Record<string, typeof Tractor> = {
  'Техника': Tractor, 'Запчасти': Wrench, 'Семена': Sprout, 'Удобрения': Droplets, 'СЗР': FlaskConical, 'Корма': Wheat,
  'Полевые работы': Tractor, 'Уборка урожая': Wheat, 'Услуги агронома': Eye, 'Ремонт техники': Wrench,
  'Аренда техники': Truck, 'Складские услуги': Boxes, 'Грузоперевозки': Truck, 'Лаборатория': FlaskConical, 'Юр. и бухгалтерия': FileText,
}
const CAT_GRAD: Record<string, string> = {
  'Техника': 'from-sky/30 to-sky/5', 'Запчасти': 'from-ink/20 to-ink/5', 'Семена': 'from-ok/30 to-ok/5',
  'Удобрения': 'from-brand/25 to-brand/5', 'СЗР': 'from-sky/30 to-sky/5', 'Корма': 'from-warn/30 to-warn/5',
  'Полевые работы': 'from-ok/30 to-ok/5', 'Уборка урожая': 'from-warn/30 to-warn/5', 'Услуги агронома': 'from-ok/25 to-ok/5',
  'Ремонт техники': 'from-ink/20 to-ink/5', 'Аренда техники': 'from-sky/25 to-sky/5', 'Складские услуги': 'from-brand/20 to-brand/5',
  'Грузоперевозки': 'from-sky/25 to-sky/5', 'Лаборатория': 'from-ok/25 to-ok/5', 'Юр. и бухгалтерия': 'from-ink/15 to-ink/5',
}
const DELIVERY_LABEL: Record<Listing['delivery'], string> = {
  'Доставка': 'Доставка', 'самовывоз': 'самовывоз', 'по РФ': 'доставка по РФ', 'нет': 'выезд исполнителя',
}

type Tab = 'goods' | 'services' | 'sellers' | 'ads'
type Sort = 'pop' | 'asc' | 'desc'

export function SellerMarket() {
  const { submit } = useMarket()
  const { role } = useApp()
  const { ads, addAd } = useC2C()
  // контекст покупателя/автора — по роли кабинета
  const buyer = role === 'seed' ? { farm: 'Genesis · селекция', who: 'Надежда Верещак', region: 'Краснодарский край' }
    : role === 'owner' ? { farm: FARM.name, who: 'Андрей · директор', region: FARM.region }
      : { farm: FARM.name, who: 'Виктор Степанович', region: FARM.region }

  const [tab, setTab] = useState<Tab>('goods')
  const [cat, setCat] = useState('все')
  const [sort, setSort] = useState<Sort>('pop')
  const [sellerFilter, setSellerFilter] = useState<string | null>(null)
  const [cart, setCart] = useState<Set<string>>(new Set())
  const [fav, setFav] = useState<Set<string>>(new Set())
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [adModal, setAdModal] = useState(false)
  const [adCat, setAdCat] = useState('все')
  const toast = useToast()

  const cats = tab === 'goods' ? GOODS_CATS : SERVICE_CATS
  const flash = (m: string) => toast(m)

  const list = useMemo(() => {
    let l = LISTINGS.filter((x) => (tab === 'goods' ? x.kind === 'товар' : x.kind === 'услуга'))
    if (cat !== 'все') l = l.filter((x) => x.cat === cat)
    if (sellerFilter) l = l.filter((x) => x.sellerId === sellerFilter)
    if (sort !== 'pop') l = [...l].sort((a, b) => ((a.price ?? 1e15) - (b.price ?? 1e15)) * (sort === 'asc' ? 1 : -1))
    return l
  }, [tab, cat, sort, sellerFilter])

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n)
  }
  const submitOne = (l: Listing) => {
    const s = sellerById(l.sellerId)
    submit({ category: l.cat, product: l.name, brand: s?.name ?? 'продавец', farm: buyer.farm, agronom: buyer.who, region: buyer.region, detail: `${l.kind} · ${priceLabel(l)}` })
  }
  const adsList = ads.filter((a) => adCat === 'все' || a.cat === adCat)
  const contact = (l: Listing) => { submitOne(l); setSent((s) => new Set(s).add(l.id)); flash(`Запрос отправлен продавцу «${sellerById(l.sellerId)?.name}»`) }
  const checkout = () => {
    LISTINGS.filter((l) => cart.has(l.id)).forEach(submitOne)
    flash(`${cart.size} заяв${cart.size === 1 ? 'ка отправлена' : cart.size < 5 ? 'ки отправлены' : 'ок отправлено'} продавцам`)
    setCart(new Set())
  }

  const activeSeller = sellerFilter ? sellerById(sellerFilter) : null

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6 pb-24">
      {/* hero */}
      <div className="rounded-2xl overflow-hidden mb-4 bg-gradient-to-r from-[#13241b] to-[#1f3a2b] text-white p-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-lg font-extrabold flex items-center gap-2"><Store size={20} />Витрина поставщиков</div>
          <p className="text-sm text-white/75 mt-1 max-w-2xl">Открытый каталог: товары и услуги от проверенных продавцов. Финподдержка и логистика — через платформу: рассрочка/лизинг, Доставка, верификация продавца.</p>
        </div>
        <button onClick={() => flash('Заявка на рассрочку/лизинг отправлена — менеджер свяжется')} className="shrink-0 inline-flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:brightness-110"><Percent size={15} />Рассрочка / лизинг 0%</button>
      </div>

      {/* sub-tabs */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="inline-flex rounded-xl bg-canvas p-1">
          {([['goods', 'Товары'], ['services', 'Услуги'], ['sellers', 'Компании'], ['ads', 'Объявления']] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setCat('все'); setSellerFilter(null) }} className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition ${tab === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        {(tab === 'goods' || tab === 'services') && (
          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="appearance-none bg-white border border-line rounded-xl pl-3 pr-8 py-2 text-sm font-semibold text-ink">
              <option value="pop">По популярности</option><option value="asc">Сначала дешевле</option><option value="desc">Сначала дороже</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {/* drill-in продавца */}
      {activeSeller && tab !== 'sellers' && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-muted">Каталог продавца:</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink bg-white border border-line rounded-full pl-2.5 pr-1.5 py-1">{activeSeller.name}{activeSeller.verified && <ShieldCheck size={13} className="text-ok" />}<button onClick={() => setSellerFilter(null)} className="ml-1 text-muted hover:text-risk"><X size={13} /></button></span>
        </div>
      )}

      {tab === 'ads' ? (
        <>
          {/* C2C объявления: фермер ↔ фермер */}
          <div className="rounded-2xl border border-line bg-canvas/60 p-3 mb-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white grid place-items-center text-brand shrink-0"><Users size={18} /></span>
            <div className="flex-1 text-sm text-ink"><b>Доска объявлений</b> — напрямую между хозяйствами: излишки, б/у техника, услуги частников, «куплю». Без комиссии, договор и доставка — через платформу.</div>
            <button onClick={() => setAdModal(true)} className="shrink-0 inline-flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold hover:brightness-110"><Plus size={15} />Подать объявление</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Chip on={adCat === 'все'} onClick={() => setAdCat('все')}>Все</Chip>
            {AD_CATS.map((c) => <Chip key={c} on={adCat === c} onClick={() => setAdCat(c)}>{c}</Chip>)}
          </div>
          <div className="text-xs text-muted mb-2">Найдено <b className="text-ink">{adsList.length}</b> объявлений от хозяйств.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adsList.map((a) => <AdCard key={a.id} a={a} onContact={() => flash(`Сообщение отправлено: «${a.author}»`)} mine={a.author === buyer.farm} />)}
          </div>
          {!adsList.length && <div className="text-sm text-muted py-8 text-center">Нет объявлений по фильтру.</div>}
        </>
      ) : tab === 'sellers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SELLERS.map((s) => <SellerCard key={s.id} s={s} onOpen={() => { setSellerFilter(s.id); setTab(LISTINGS.some((l) => l.sellerId === s.id && l.kind === 'услуга') && !LISTINGS.some((l) => l.sellerId === s.id && l.kind === 'товар') ? 'services' : 'goods') }} />)}
        </div>
      ) : (
        <>
          {/* category chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Chip on={cat === 'все'} onClick={() => setCat('все')}>Все</Chip>
            {cats.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>

          {/* promo tiles (только без фильтра продавца) */}
          {!sellerFilter && cat === 'все' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[['Спецпредложения недели', 'from-brand/15 to-brand/5', 'Percent'], ['Техника в лизинг 0%', 'from-sky/20 to-sky/5', 'Tractor'], ['Семена топ-гибриды', 'from-ok/20 to-ok/5', 'Sprout'], ['Услуги под ключ', 'from-warn/20 to-warn/5', 'Wrench']].map(([t, g]) => (
                <div key={t} className={`rounded-2xl bg-gradient-to-br ${g} border border-line p-3 text-sm font-bold text-ink`}>{t}<div className="text-[11px] font-normal text-muted mt-0.5">смотреть →</div></div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted mb-2">Найдено <b className="text-ink">{list.length}</b> предложений от продавцов.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((l) => (
              <ListingCard key={l.id} l={l}
                inCart={cart.has(l.id)} faved={fav.has(l.id)} sent={sent.has(l.id)}
                onCart={() => toggle(cart, setCart, l.id)} onFav={() => toggle(fav, setFav, l.id)}
                onContact={() => contact(l)} onSeller={() => setSellerFilter(l.sellerId)} />
            ))}
          </div>
          {!list.length && <div className="text-sm text-muted py-8 text-center">Нет предложений по фильтру.</div>}
        </>
      )}

      {/* плавающая корзина */}
      {cart.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[600] flex items-center gap-3 bg-ink text-white rounded-2xl pl-4 pr-2 py-2 shadow-2xl">
          <ShoppingCart size={16} /><span className="text-sm font-semibold">В корзине {cart.size}</span>
          <button onClick={checkout} className="bg-brand text-white rounded-xl px-3.5 py-1.5 text-sm font-bold hover:brightness-110">Оформить заявку</button>
          <button onClick={() => setCart(new Set())} className="text-white/60 hover:text-white px-1"><X size={16} /></button>
        </div>
      )}

      <AdModal open={adModal} author={buyer.farm} region={buyer.region} onClose={() => setAdModal(false)}
        onSave={(a) => { addAd(a); setAdModal(false); setTab('ads'); setAdCat('все'); flash('Объявление опубликовано') }} />
    </div>
  )
}

function AdCard({ a, onContact, mine }: { a: Ad; onContact: () => void; mine: boolean }) {
  return (
    <div className={`bg-white border rounded-2xl p-3.5 flex flex-col ${mine ? 'border-brand/40' : 'border-line'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${AD_TONE[a.type]}`}>{a.type}</span>
        <span className="text-[11px] text-muted">{a.cat}{a.condition ? ` · ${a.condition}` : ''}</span>
        {mine && <span className="text-[10px] font-semibold text-brand bg-brand-soft px-1.5 py-0.5 rounded-md">моё</span>}
        <span className="ml-auto text-[11px] text-muted">{a.date}</span>
      </div>
      <div className="font-semibold text-ink leading-snug">{a.title}</div>
      <p className="text-xs text-muted mt-1 line-clamp-2">{a.text}</p>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><Users size={11} />{a.author}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.region}</span>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="font-extrabold text-ink">{a.price != null ? `${a.price.toLocaleString('ru-RU')} ${a.unit ?? '₽'}` : 'договорная'}</span>
        <button onClick={onContact} disabled={mine} className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold inline-flex items-center gap-1.5 ${mine ? 'bg-canvas text-muted' : 'bg-brand text-white hover:brightness-105'}`}><MessageSquare size={13} />{mine ? 'ваше объявление' : 'Написать'}</button>
      </div>
    </div>
  )
}

function AdModal({ open, author, region, onClose, onSave }: {
  open: boolean; author: string; region: string; onClose: () => void
  onSave: (a: Omit<Ad, 'id' | 'date'>) => void
}) {
  const [type, setType] = useState<AdType>('продам')
  const [cat, setCat] = useState<string>(AD_CATS[0])
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [text, setText] = useState('')
  const p = parseFloat(price.replace(/\s/g, '')) || null
  return (
    <Modal open={open} title="Подать объявление" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тип"><Select value={type} onChange={(e) => setType(e.target.value as AdType)}><option value="продам">Продам</option><option value="куплю">Куплю</option><option value="услуга">Услуга</option></Select></Field>
        <Field label="Категория"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{AD_CATS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label="Заголовок"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Сеялка СЗ-5,4 после ремонта" /></Field>
      <Field label="Цена, ₽ (пусто → договорная)"><Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" inputMode="numeric" /></Field>
      <Field label="Описание"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="состояние, объём, условия, самовывоз/доставка…" /></Field>
      <div className="text-xs text-muted mb-3">Автор: <b className="text-ink">{author}</b> · {region}</div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-line hover:bg-canvas">Отмена</button>
        <button disabled={!title.trim()} onClick={() => onSave({ type, cat, title: title.trim(), author, region, price: p, unit: '₽', text: text.trim() || '—' })} className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white disabled:opacity-40">Опубликовать</button>
      </div>
    </Modal>
  )
}

function ListingCard({ l, inCart, faved, sent, onCart, onFav, onContact, onSeller }: {
  l: Listing; inCart: boolean; faved: boolean; sent: boolean
  onCart: () => void; onFav: () => void; onContact: () => void; onSeller: () => void
}) {
  const s = sellerById(l.sellerId)!
  const I = CAT_ICON[l.cat] ?? Store
  const discount = l.oldPrice && l.price ? Math.round((1 - l.price / l.oldPrice) * 100) : 0
  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden flex flex-col">
      {/* фото-плейсхолдер */}
      <div className={`relative h-32 bg-gradient-to-br ${CAT_GRAD[l.cat] ?? 'from-canvas to-white'} grid place-items-center`}>
        <I size={40} className="text-ink/25" />
        {l.hit && <span className="absolute top-2 left-2 text-[10px] font-bold bg-brand text-white px-2 py-0.5 rounded-full">спецпредложение</span>}
        {discount > 0 && <span className="absolute top-2 right-9 text-[10px] font-bold bg-risk text-white px-1.5 py-0.5 rounded-md">−{discount}%</span>}
        <button onClick={onFav} className={`absolute top-2 right-2 w-6 h-6 rounded-full grid place-items-center bg-white/85 ${faved ? 'text-risk' : 'text-muted hover:text-ink'}`}><Heart size={13} className={faved ? 'fill-risk' : ''} /></button>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <span className="text-[10px] font-semibold text-muted">{l.cat}</span>
        <div className="font-semibold text-ink text-sm leading-snug mt-0.5 line-clamp-2">{l.name}</div>

        {/* продавец */}
        <button onClick={onSeller} className="flex items-center gap-1.5 mt-1.5 text-left">
          <span className="w-5 h-5 rounded-md bg-canvas grid place-items-center text-[9px] font-bold text-ink shrink-0">{s.name.slice(0, 2).toUpperCase()}</span>
          <span className="text-[11px] text-muted truncate hover:text-ink">{s.name}</span>
          {s.verified && <ShieldCheck size={11} className="text-ok shrink-0" />}
          <span className="inline-flex items-center gap-0.5 text-[11px] text-ink shrink-0"><Star size={10} className="text-warn fill-warn" />{s.rating}</span>
        </button>

        <div className="text-[10px] text-muted mt-1 inline-flex items-center gap-1"><Truck size={11} />{DELIVERY_LABEL[l.delivery]}</div>

        <div className="flex-1" />
        {/* цена */}
        <div className="mt-2 flex items-end gap-2">
          {l.price != null
            ? <><span className="text-lg font-extrabold text-ink leading-none">{l.price.toLocaleString('ru-RU')} {l.unit}</span>{l.oldPrice && <span className="text-xs text-muted line-through">{l.oldPrice.toLocaleString('ru-RU')}</span>}</>
            : <span className="text-base font-bold text-ink">{priceLabel(l)}</span>}
        </div>

        {/* действия */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {l.price != null ? (
            <button onClick={onCart} className={`flex-1 rounded-xl py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${inCart ? 'bg-ok-soft text-ok' : 'bg-brand text-white hover:brightness-105'}`}>{inCart ? <><Check size={14} />В корзине</> : <><ShoppingCart size={14} />В корзину</>}</button>
          ) : (
            <button onClick={onContact} disabled={sent} className={`flex-1 rounded-xl py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${sent ? 'bg-ok-soft text-ok' : 'bg-brand text-white hover:brightness-105'}`}>{sent ? <><Check size={14} />Запрос отправлен</> : 'Узнать цену'}</button>
          )}
          <button onClick={onContact} title="Связаться с продавцом" className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${sent ? 'bg-ok-soft text-ok' : 'bg-canvas text-ink hover:bg-line'}`}><MessageSquare size={15} /></button>
          <button title="Сравнить" className="w-9 h-9 rounded-xl bg-canvas text-ink hover:bg-line grid place-items-center shrink-0"><Scale size={15} /></button>
        </div>
      </div>
    </div>
  )
}

function SellerCard({ s, onOpen }: { s: Seller; onOpen: () => void }) {
  const count = LISTINGS.filter((l) => l.sellerId === s.id).length
  return (
    <div className="bg-white border border-line rounded-2xl p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-canvas grid place-items-center text-sm font-extrabold text-ink shrink-0">{s.name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-ink leading-tight flex items-center gap-1.5">{s.name}{s.verified && <ShieldCheck size={14} className="text-ok shrink-0" />}</div>
          <div className="text-[11px] text-muted">{s.kind}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-ink"><Star size={13} className="text-warn fill-warn" />{s.rating}</span>
        <span className="text-muted text-xs">{s.deals.toLocaleString('ru-RU')} сделок</span>
        <span className="text-muted text-xs">· с {s.since}</span>
      </div>
      <div className="text-[11px] text-muted mt-1">{s.region} · {count} предложений {s.verified && <span className="text-ok font-semibold">· проверен платформой</span>}</div>
      <div className="flex-1" />
      <button onClick={onOpen} className="mt-3 w-full rounded-xl bg-canvas hover:bg-brand-soft text-ink py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5"><Sparkles size={14} className="text-brand" />Каталог продавца</button>
    </div>
  )
}

function Chip({ children, on, onClick }: { children: React.ReactNode; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${on ? 'bg-ink text-white border-ink' : 'bg-white border-line text-muted hover:text-ink'}`}>{children}</button>
}
