import { useMemo } from 'react'
import { useApp } from '../../store'
import { useAgro } from '../../agroStore'
import { useInventory } from '../../inventoryStore'
import { AG_FIELDS } from '../../agronomData'
import { RES_TYPES, type ResType, consumptionMovements, buildStockRows, rub } from '../../inventoryData'
import { Boxes, AlertTriangle, ArrowRight, Wallet } from 'lucide-react'

// Демо-бюджет расхода по типам за сезон (план), ₽ — для флага перерасхода.
const PLAN_OUT: Partial<Record<ResType, number>> = { 'Топливо': 1_900_000, 'СЗР': 1_400_000, 'Удобрения': 2_600_000 }

export function OwnerWarehouse() {
  const { go } = useApp()
  const { issues } = useAgro()
  const { inFor, purchases } = useInventory()

  const consumption = useMemo(() => consumptionMovements(issues), [issues])
  const rows = useMemo(() => buildStockRows(inFor, consumption), [inFor, consumption, purchases])
  const totalHa = AG_FIELDS.reduce((s, f) => s + f.areaHa, 0)

  const stockValue = rows.reduce((s, r) => s + r.balanceSum, 0)
  const seasonOut = rows.reduce((s, r) => s + r.outSum, 0)
  const lowCount = rows.filter((r) => r.low).length

  // агрегат по типам
  const byType = RES_TYPES.map((t) => {
    const rs = rows.filter((r) => r.type === t)
    if (!rs.length) return null
    const balanceSum = rs.reduce((s, r) => s + r.balanceSum, 0)
    const outSum = rs.reduce((s, r) => s + r.outSum, 0)
    const inSum = rs.reduce((s, r) => s + r.inSum, 0)
    const plan = PLAN_OUT[t]
    const over = plan ? outSum > plan : false
    return { type: t, balanceSum, outSum, inSum, plan, over }
  }).filter(Boolean) as { type: ResType; balanceSum: number; outSum: number; inSum: number; plan?: number; over: boolean }[]

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Wallet size={22} className="text-brand" />Склад · финансы</h1>
        <p className="text-sm text-muted mt-0.5">Замороженный в запасах капитал, расход на гектар и контроль перерасхода против плана сезона.</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Kpi v={rub(stockValue)} l="стоимость остатков (замороженный капитал)" />
        <Kpi v={rub(seasonOut)} l="израсходовано за сезон" />
        <Kpi v={rub(seasonOut / totalHa)} l={`расход на гектар · ${totalHa.toLocaleString('ru-RU')} га`} />
        <Kpi v={String(lowCount)} l="позиций ниже мин. остатка" accent={lowCount > 0} />
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 font-bold text-ink border-b border-line">Расход по статьям: факт vs план сезона</div>
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">
            <th className="text-left font-medium p-3">Статья</th>
            <th className="text-right font-medium p-3">Остаток на складе</th>
            <th className="text-right font-medium p-3">Закуплено</th>
            <th className="text-right font-medium p-3">Израсходовано</th>
            <th className="text-left font-medium p-3 w-56">План сезона</th>
          </tr></thead>
          <tbody>
            {byType.map((b) => {
              const pct = b.plan ? Math.min(Math.round((b.outSum / b.plan) * 100), 140) : 0
              return (
                <tr key={b.type} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="p-3 font-semibold text-ink">{b.type}</td>
                  <td className="p-3 text-right">{rub(b.balanceSum)}</td>
                  <td className="p-3 text-right text-muted">{rub(b.inSum)}</td>
                  <td className="p-3 text-right text-ink">{rub(b.outSum)}</td>
                  <td className="p-3">
                    {b.plan ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: b.over ? '#e5302a' : '#2da84f' }} /></div>
                        <span className={`text-xs font-semibold w-10 text-right ${b.over ? 'text-risk' : 'text-muted'}`}>{pct}%</span>
                      </div>
                    ) : <span className="text-xs text-muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {byType.some((b) => b.over) && (
        <div className="rounded-2xl border border-risk/30 bg-risk-soft/40 p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-risk shrink-0" />
          <div className="text-sm text-ink flex-1">Перерасход против плана: <b>{byType.filter((b) => b.over).map((b) => b.type).join(', ')}</b>. Проверьте нормы внесения и дисциплину работ.</div>
        </div>
      )}

      <p className="text-xs text-muted mt-4">Данные склада формируются автоматически из работ агронома и закупок. Закупки выше лимита проходят через <button onClick={() => go('ownerApprovals')} className="text-brand font-semibold inline-flex items-center gap-0.5">Согласования <ArrowRight size={11} /></button></p>
    </div>
  )
}

function Kpi({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return <div className="bg-white border border-line rounded-2xl p-4"><div className={`text-[22px] font-extrabold leading-none ${accent ? 'text-brand' : 'text-ink'}`}><span className="inline-flex items-center gap-1.5"><Boxes size={16} className="text-muted" />{v}</span></div><div className="text-xs text-muted mt-1.5">{l}</div></div>
}
