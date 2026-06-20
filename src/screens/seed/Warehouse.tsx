import { useSeed } from '../../seedStore'
import { PRICE_BY_HYBRID, CARRYOVER_PU } from '../../seedData'
import { Card, SectionTitle, Stat, Pill, Icon } from '../../ui'
import { rub } from '../../inventoryData'

// Склад семеновода — это ГОТОВАЯ ПРОДУКЦИЯ (партии F1 в п.е.),
// а не входы. Резерв под контракты vs свободный остаток к продаже.
export function SeedWarehouse() {
  const { lots, contracts } = useSeed()

  const hybrids = Array.from(new Set(lots.map((l) => l.hybrid)))
  const rows = hybrids.map((h) => {
    const produced = lots.filter((l) => l.hybrid === h).reduce((s, l) => s + l.pu, 0)
    const carry = CARRYOVER_PU[h] ?? 0
    const onHand = produced + carry
    const reserved = contracts.filter((c) => c.hybrid === h && c.status !== 'закрыт').reduce((s, c) => s + c.pu, 0)
    const free = onHand - reserved
    const price = PRICE_BY_HYBRID[h] ?? 18000
    return { hybrid: h, produced, carry, onHand, reserved, free, price, value: free * price, short: free < 0 }
  })

  const totalOnHand = rows.reduce((s, r) => s + r.onHand, 0)
  const totalReserved = rows.reduce((s, r) => s + r.reserved, 0)
  const totalFree = rows.reduce((s, r) => s + Math.max(r.free, 0), 0)
  const stockValue = rows.reduce((s, r) => s + Math.max(r.free, 0) * r.price, 0)
  const shortHybrids = rows.filter((r) => r.short)

  return (
    <div>
      <SectionTitle sub="Готовая продукция (посевные единицы F1) на складе: партии, резерв под контракты и свободный остаток к продаже.">
        Склад готовой продукции
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card><Stat value={totalOnHand.toLocaleString('ru-RU')} label="на складе, п.е. (с переходящим)" /></Card>
        <Card><Stat value={totalReserved.toLocaleString('ru-RU')} label="зарезервировано под контракты" /></Card>
        <Card><Stat value={totalFree.toLocaleString('ru-RU')} label="свободно к продаже, п.е." accent /></Card>
        <Card><Stat value={rub(stockValue)} label="стоимость свободного остатка" /></Card>
      </div>

      {/* баланс по гибридам */}
      <Card pad={false} className="overflow-hidden mb-5">
        <div className="p-4 font-bold text-ink">Баланс по гибридам</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Гибрид</th>
            <th className="text-right font-medium p-3">На складе</th>
            <th className="text-right font-medium p-3">Резерв</th>
            <th className="text-right font-medium p-3">Свободно</th>
            <th className="text-left font-medium p-3 w-48">Загрузка резервом</th>
            <th className="text-right font-medium p-3">Стоимость свободного</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.onHand > 0 ? Math.min(Math.round((r.reserved / r.onHand) * 100), 100) : 0
              return (
                <tr key={r.hybrid} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="p-3 font-semibold text-ink">{r.hybrid}</td>
                  <td className="p-3 text-right">{r.onHand.toLocaleString('ru-RU')}{r.carry > 0 && <div className="text-[10px] text-muted">в т.ч. {r.carry.toLocaleString('ru-RU')} переход.</div>}</td>
                  <td className="p-3 text-right text-muted">{r.reserved.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right font-bold"><span className={r.short ? 'text-risk' : 'text-ink'}>{r.free.toLocaleString('ru-RU')}</span></td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.short ? '#e5302a' : '#fc3f1d' }} /></div><span className="text-xs text-muted w-9 text-right">{pct}%</span></div></td>
                  <td className="p-3 text-right text-ink">{rub(Math.max(r.free, 0) * r.price)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </Card>

      {!!shortHybrids.length && (
        <div className="rounded-2xl border border-risk/30 bg-risk-soft/40 p-4 mb-5 flex items-center gap-3">
          <Icon name="AlertTriangle" size={18} className="text-risk shrink-0" />
          <div className="text-sm text-ink">Контрактов больше, чем готовой продукции: <b>{shortHybrids.map((r) => r.hybrid).join(', ')}</b>. Нужно нарастить размножение или перенести сроки поставки.</div>
        </div>
      )}

      {/* партии */}
      <Card pad={false} className="overflow-hidden">
        <div className="p-4 font-bold text-ink">Партии на складе</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Партия</th>
            <th className="text-left font-medium p-3">Гибрид</th>
            <th className="text-left font-medium p-3">Участок</th>
            <th className="text-right font-medium p-3">Объём, п.е.</th>
            <th className="text-left font-medium p-3">Контроль качества</th>
          </tr></thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                <td className="p-3 font-semibold text-ink">{l.batch}</td>
                <td className="p-3 text-ink">{l.hybrid}</td>
                <td className="p-3 text-muted text-xs">{l.plot}</td>
                <td className="p-3 text-right">{l.pu.toLocaleString('ru-RU')}</td>
                <td className="p-3">{l.verified ? <Pill tone="ok"><Icon name="ShieldCheck" size={12} />сертифицирована</Pill> : <Pill tone="brand"><Icon name="AlertTriangle" size={12} />на проверке{l.claims > 0 ? ` · ${l.claims} реклам.` : ''}</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}
