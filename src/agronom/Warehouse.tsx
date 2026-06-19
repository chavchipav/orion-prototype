import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { useAgro } from '../agroStore'
import { useMarket } from '../marketStore'
import { useInventory } from '../inventoryStore'
import { FARM } from '../agronomData'
import { Modal, Field, Input, Select } from '../components/Modal'
import {
  STOCK_ITEMS, RES_TYPES, type ResType, type StockRow,
  consumptionMovements, buildStockRows, stockItemById, rub,
  type Movement,
} from '../inventoryData'
import { Plus, Boxes, TrendingDown, AlertTriangle, ArrowDownRight, ArrowUpRight, Truck, Check, Sparkles, ShoppingBag } from 'lucide-react'

const TYPE_TONE: Record<ResType, string> = {
  'Семена': 'bg-ok-soft text-ok', 'СЗР': 'bg-sky-soft text-sky', 'Удобрения': 'bg-brand-soft text-brand',
  'Топливо': 'bg-warn-soft text-warn', 'Оплата': 'bg-canvas text-muted', 'Прочее': 'bg-canvas text-muted',
}
// какие типы можно дозаказать через маркетплейс
const MARKET_CAT: Partial<Record<ResType, string>> = { 'СЗР': 'СЗР', 'Удобрения': 'Удобрения' }

export function Warehouse() {
  const { go } = useApp()
  const { issues } = useAgro()
  const { requests, submit } = useMarket()
  const { purchases, receivedReqIds, inFor, addPurchase, receiveRequest } = useInventory()

  const [tab, setTab] = useState<'stock' | 'ops'>('stock')
  const [typeFilter, setTypeFilter] = useState<ResType | 'all'>('all')
  const [modal, setModal] = useState(false)
  const [ordered, setOrdered] = useState<string[]>([])

  const consumption = useMemo(() => consumptionMovements(issues), [issues])
  const rows = useMemo(() => buildStockRows(inFor, consumption), [inFor, consumption, purchases])
  const shown = rows.filter((r) => typeFilter === 'all' || r.type === typeFilter)

  // единый журнал движений: приходы (закупки) + расходы (работы)
  const purchaseMoves: Movement[] = purchases.map((p) => ({
    id: p.id, stockId: p.stockId, name: p.name, type: p.type, unit: p.unit,
    dir: 'in', qty: p.qty, sum: p.qty * p.price, date: p.date, viaMarket: p.viaMarket,
    work: p.comment,
  }))
  const ledger = [...purchaseMoves, ...consumption].sort((a, b) => (b.date > a.date ? 1 : -1))
  const ledgerShown = ledger.filter((m) => typeFilter === 'all' || m.type === typeFilter)

  const stockValue = rows.reduce((s, r) => s + r.balanceSum, 0)
  const lowRows = rows.filter((r) => r.low)
  const seasonOut = consumption.reduce((s, m) => s + m.sum, 0)
  const seasonIn = purchaseMoves.reduce((s, m) => s + m.sum, 0)

  // закрытые заявки маркетплейса, не оприходованные → предложить приход
  const toReceive = requests.filter((r) => r.status === 'закрыта' && !receivedReqIds.includes(r.id))

  const order = (r: StockRow) => {
    submit({ category: MARKET_CAT[r.type] ?? 'СЗР', product: r.name, brand: '—', farm: FARM.name, agronom: 'Пётр И.', region: FARM.region, detail: `пополнение склада: ниже мин. остатка (${r.balance} ${r.unit})` })
    setOrdered((s) => [...s, r.id])
  }
  const receive = (reqId: string, product: string, category: string) => {
    const it = STOCK_ITEMS.find((s) => product.toLowerCase().startsWith(s.name.toLowerCase()) || s.name.toLowerCase().startsWith(product.toLowerCase()))
        ?? STOCK_ITEMS.find((s) => s.type === (category as ResType))
        ?? STOCK_ITEMS[0]
    receiveRequest(reqId, { stockId: it.id, name: it.name, type: it.type, unit: it.unit, qty: Math.max(it.min, Math.round(it.min * 2)), price: it.price })
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Boxes size={20} className="text-brand" />Склад</h2>
          <p className="text-sm text-muted">Приход — закупки и заявки. Расход списывается автоматически из «Работ»: ГСМ и СЗР по норме на гектар.</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90"><Plus size={16} />Создание закупки</button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi v={rub(stockValue)} l="стоимость склада (замороженный капитал)" />
        <Kpi v={String(lowRows.length)} l="позиций ниже мин. остатка" accent={lowRows.length > 0} />
        <Kpi v={rub(seasonOut)} l="расход за сезон (списано на работы)" />
        <Kpi v={rub(seasonIn)} l="приход за сезон (закуплено)" />
      </div>

      {/* предиктивная карточка — низкий остаток → заказ через маркетплейс */}
      {!!lowRows.length && (
        <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-4 mb-4">
          <div className="flex items-center gap-2 font-bold text-ink mb-2"><Sparkles size={16} className="text-brand" />Ассистент: по плану работ запасов не хватит</div>
          <div className="space-y-2">
            {lowRows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <AlertTriangle size={14} className="text-brand shrink-0" />
                <div className="flex-1"><b className="text-ink">{r.name}</b> — остаток {r.balance} {r.unit} <span className="text-muted">при минимуме {r.min} {r.unit}</span></div>
                {MARKET_CAT[r.type]
                  ? ordered.includes(r.id)
                    ? <span className="text-xs font-semibold text-ok inline-flex items-center gap-1"><Check size={13} />Заявка отправлена дистрибьютору</span>
                    : <button onClick={() => order(r)} className="text-xs font-bold text-brand inline-flex items-center gap-1 shrink-0"><ShoppingBag size={13} />Заказать через Маркетплейс</button>
                  : <span className="text-xs text-muted">пополнить вручную</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* заявки маркетплейса, ожидающие оприходования */}
      {!!toReceive.length && (
        <div className="rounded-2xl border border-ok/30 bg-ok-soft/40 p-4 mb-4">
          <div className="flex items-center gap-2 font-bold text-ink mb-2"><Truck size={16} className="text-ok" />Поставки от дистрибьютора — оприходовать на склад</div>
          <div className="space-y-2">
            {toReceive.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <div className="flex-1"><b className="text-ink">{r.product}</b> <span className="text-muted">· {r.category} · заявка от {r.date}</span></div>
                <button onClick={() => receive(r.id, r.product, r.category)} className="text-xs font-bold text-ok inline-flex items-center gap-1 shrink-0"><Check size={13} />Оприходовать</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* вкладки */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex rounded-xl bg-canvas p-1">
          {(['stock', 'ops'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${tab === t ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{t === 'stock' ? 'Складские запасы' : 'Операции на складе'}</button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <FChip on={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Все</FChip>
          {RES_TYPES.filter((t) => t !== 'Оплата' && t !== 'Прочее').map((t) => (
            <FChip key={t} on={typeFilter === t} onClick={() => setTypeFilter(t)}>{t}</FChip>
          ))}
        </div>
      </div>

      {tab === 'stock' ? (
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">
              <th className="text-left font-medium p-3">Наименование</th>
              <th className="text-left font-medium p-3">Тип</th>
              <th className="text-left font-medium p-3">Ед.</th>
              <th className="text-right font-medium p-3">Остаток</th>
              <th className="text-right font-medium p-3">Остаток на сумму</th>
              <th className="text-right font-medium p-3">Расход</th>
              <th className="text-right font-medium p-3">Приход</th>
              <th className="text-right font-medium p-3">Действия</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-b border-line last:border-0 hover:bg-canvas ${r.low ? 'bg-brand-soft/20' : ''}`}>
                  <td className="p-3 font-semibold text-ink">{r.name}</td>
                  <td className="p-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_TONE[r.type]}`}>{r.type}</span></td>
                  <td className="p-3 text-muted">{r.unit}</td>
                  <td className="p-3 text-right font-bold">
                    <span className={r.low ? 'text-brand' : 'text-ink'}>{r.balance.toLocaleString('ru-RU')}</span>
                    {r.low && <div className="text-[10px] text-brand font-semibold">ниже мин. {r.min}</div>}
                  </td>
                  <td className="p-3 text-right text-ink">{rub(r.balanceSum)}</td>
                  <td className="p-3 text-right text-muted">{r.outQty > 0 ? <span className="inline-flex items-center gap-0.5 text-warn"><ArrowDownRight size={12} />{r.outQty.toLocaleString('ru-RU')}</span> : '—'}</td>
                  <td className="p-3 text-right text-muted">{r.inQty > 0 ? <span className="inline-flex items-center gap-0.5 text-ok"><ArrowUpRight size={12} />{r.inQty.toLocaleString('ru-RU')}</span> : '—'}</td>
                  <td className="p-3 text-right"><button onClick={() => setModal(true)} className="text-xs font-semibold text-brand">Закупить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">
              <th className="text-left font-medium p-3">Наименование</th>
              <th className="text-left font-medium p-3">Тип</th>
              <th className="text-left font-medium p-3">Дата</th>
              <th className="text-left font-medium p-3">Движение МЦ</th>
              <th className="text-right font-medium p-3">Стоимость</th>
              <th className="text-left font-medium p-3">Работа</th>
              <th className="text-left font-medium p-3">Поле</th>
            </tr></thead>
            <tbody>
              {ledgerShown.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="p-3 font-semibold text-ink">{m.name}</td>
                  <td className="p-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_TONE[m.type]}`}>{m.type}</span></td>
                  <td className="p-3 text-muted">{m.date}</td>
                  <td className="p-3">
                    {m.dir === 'in'
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><ArrowUpRight size={13} />+{m.qty.toLocaleString('ru-RU')} {m.unit}{m.viaMarket && <span className="ml-1 text-[10px] text-muted">маркетплейс</span>}</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold text-warn"><ArrowDownRight size={13} />−{m.qty.toLocaleString('ru-RU')} {m.unit}</span>}
                  </td>
                  <td className="p-3 text-right text-ink">{rub(m.sum)}</td>
                  <td className="p-3 text-muted">{m.dir === 'out' ? (m.work ?? '—') : (m.work ?? 'закупка')}</td>
                  <td className="p-3 text-muted">{m.field ?? '—'}</td>
                </tr>
              ))}
              {!ledgerShown.length && <tr><td colSpan={7} className="p-8 text-center text-muted">Нет операций по фильтру</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-3 flex items-center gap-1.5"><TrendingDown size={13} className="text-warn" />Списание <span className="text-warn font-semibold">расхода</span> связано с «Работами»: отметка «Факт» по обработке мгновенно уменьшает остаток СЗР и ГСМ. <button onClick={() => go('agWorks')} className="text-brand font-semibold">Открыть Работы →</button></p>

      <PurchaseModal open={modal} onClose={() => setModal(false)} onSave={(p) => { addPurchase(p); setModal(false) }} />
    </div>
  )
}

function PurchaseModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (p: { stockId: string; name: string; type: ResType; unit: string; qty: number; price: number; comment?: string }) => void }) {
  const [type, setType] = useState<ResType>('СЗР')
  const items = STOCK_ITEMS.filter((s) => s.type === type)
  const [stockId, setStockId] = useState(items[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [total, setTotal] = useState('')
  const [comment, setComment] = useState('')

  const it = stockItemById(stockId) ?? STOCK_ITEMS.find((s) => s.type === type) ?? STOCK_ITEMS[0]
  const q = parseFloat(qty.replace(',', '.')) || 0
  const t = parseFloat(total.replace(',', '.')) || 0
  const price = q > 0 ? t / q : it.price

  const onType = (newType: ResType) => {
    setType(newType)
    const first = STOCK_ITEMS.find((s) => s.type === newType)
    setStockId(first?.id ?? '')
  }

  return (
    <Modal open={open} title="Создание закупки" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Тип расходника">
          <Select value={type} onChange={(e) => onType(e.target.value as ResType)}>
            {RES_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
          </Select>
        </Field>
        <Field label="Наименование">
          <Select value={stockId} onChange={(e) => setStockId(e.target.value)}>
            {items.length ? items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">— нет позиций —</option>}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Объём, ${it.unit}`}><Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" inputMode="decimal" /></Field>
        <Field label="Общая стоимость, ₽"><Input value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" inputMode="decimal" /></Field>
      </div>
      <Field label="Комментарий"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="напр. предсезонный завоз" /></Field>
      <div className="text-xs text-muted mb-3">Цена за единицу: <b className="text-ink">{rub(price)}</b> / {it.unit}{q > 0 && <> · приход <b className="text-ink">+{q.toLocaleString('ru-RU')} {it.unit}</b></>}</div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-ink border border-line hover:bg-canvas">Отменить</button>
        <button disabled={!stockId || q <= 0} onClick={() => onSave({ stockId, name: it.name, type: it.type, unit: it.unit, qty: q, price, comment: comment || undefined })} className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white disabled:opacity-40">Сохранить</button>
      </div>
    </Modal>
  )
}

function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-xl font-extrabold leading-tight ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-1">{l}</div></div>
}
function FChip({ children, on, onClick }: { children: React.ReactNode; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${on ? 'bg-ink text-white' : 'bg-canvas text-muted hover:text-ink'}`}>{children}</button>
}
