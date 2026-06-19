import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../../store'
import { useAgro } from '../../agroStore'
import { useApprovals } from '../../approvalStore'
import { useInventory } from '../../inventoryStore'
import { consumptionMovements, buildStockRows } from '../../inventoryData'
import { FLEET_KPI, ANTIFRAUD } from '../../telematicsData'
import { Upsell } from '../../components/Upsell'
import { CountUp } from '../../components/Delight'
import { Check, Sprout, ArrowRight, Leaf, Boxes, Radar } from 'lucide-react'

const PHASES = ['Сев', 'Всходы', 'Вегетация', 'Бутонизация', 'Цветение', 'Налив', 'Уборка']
const CUR = 3

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-line rounded-2xl ${className}`}>{children}</div>
}
function Kpi({ v, l, accent }: { v: ReactNode; l: string; accent?: boolean }) {
  return <Card className="p-4"><div className={`text-[26px] font-extrabold leading-none ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-1.5">{l}</div></Card>
}

export function OwnerDashboard() {
  const { go } = useApp()
  const { issues } = useAgro()
  const { approvals, pendingCount } = useApprovals()
  const { inFor, purchases } = useInventory()
  const [seedSent, setSeedSent] = useState(false)
  const critical = issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив' || i.status === 'обработка').slice(0, 3)
  const pending = approvals.filter((a) => a.status === 'ждёт').slice(0, 3)

  const stockRows = useMemo(() => buildStockRows(inFor, consumptionMovements(issues)), [inFor, issues, purchases])
  const stockValue = stockRows.reduce((s, r) => s + r.balanceSum, 0)
  const lowCount = stockRows.filter((r) => r.low).length

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Дашборд хозяйства</h1>
        <p className="text-sm text-muted mt-0.5">Где мы в сезоне · план по урожаю · что в работе · что ждёт вашего решения</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi v={<CountUp value={68} suffix="%" />} l="сезон пройден" />
        <Kpi v={<CountUp value={20050} suffix=" т" />} l="прогноз сбора" accent />
        <Kpi v={<CountUp value={142} />} l="действий выполнено" />
        <Kpi v={<CountUp value={pendingCount} />} l="ждут согласования" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* где мы в сезоне */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3"><div className="font-bold text-ink">Где мы в сезоне</div><span className="text-xs text-muted">фаза «бутонизация»</span></div>
            <div className="flex gap-1.5">{PHASES.map((p, i) => (
              <div key={p} className="flex-1 text-center"><div className={`h-2 rounded-full ${i <= CUR ? 'bg-ok' : 'bg-line'}`} /><div className={`text-[10px] mt-1.5 ${i === CUR ? 'font-bold text-ink' : 'text-muted'}`}>{p}</div></div>
            ))}</div>
          </Card>

          {/* критические задачи */}
          <Card className="p-5">
            <div className="font-bold text-ink mb-3">Критические задачи в работе</div>
            <div className="space-y-2.5">
              {critical.map((i) => (
                <div key={i.id} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.status === 'обработка' ? '#e0900a' : '#e5302a' }} />
                  <div className="flex-1 text-sm"><b className="text-ink">{i.fieldName}</b> · {i.problem.name} <span className="text-muted">· {i.status}</span></div>
                  <span className="text-xs font-bold" style={{ color: i.status === 'обработка' ? '#e0900a' : '#e5302a' }}>{i.status === 'обработка' ? 'в работе' : 'срочно'}</span>
                </div>
              ))}
              {!critical.length && <div className="text-sm text-muted">Критических задач нет — все проблемы закрыты.</div>}
            </div>
          </Card>

          {/* апсейл (Озон-стиль) */}
          <Upsell />
        </div>

        <div className="space-y-4">
          {/* согласования */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3"><div className="font-bold text-ink flex items-center gap-2"><Check size={16} className="text-ok" />Согласования</div>{pendingCount > 0 && <span className="text-xs font-bold bg-brand text-white rounded-full px-2 py-0.5">{pendingCount}</span>}</div>
            <div className="space-y-2.5 text-sm">
              {pending.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink truncate">{a.title}<span className="text-muted"> · {a.amount}</span></span>
                  <button onClick={() => go('ownerApprovals')} className="text-xs font-bold text-brand shrink-0">решить</button>
                </div>
              ))}
              {!pending.length && <div className="text-muted">Нет ожидающих согласований.</div>}
            </div>
            <button onClick={() => go('ownerApprovals')} className="mt-3 w-full text-xs font-semibold text-brand inline-flex items-center justify-center gap-1 hover:underline">Все согласования<ArrowRight size={12} /></button>
          </Card>

          {/* семеновод на связи */}
          <Card className="p-5 bg-ok-soft/40">
            <div className="font-bold text-ink mb-2 flex items-center gap-2"><Sprout size={16} className="text-ok" />Семеновод на связи</div>
            <p className="text-sm text-muted leading-snug">Genesis предлагает демо «Орион-С» на ваших богарных полях Юга.</p>
            {seedSent
              ? <div className="mt-2 text-xs font-semibold text-ok inline-flex items-center gap-1"><Check size={13} />Запрос отправлен — Genesis свяжется</div>
              : <button onClick={() => setSeedSent(true)} className="mt-2 text-sm font-bold text-ok inline-flex items-center gap-1"><Leaf size={14} />Открыть диалог →</button>}
          </Card>

          {/* склад · финансы */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-ink flex items-center gap-2"><Boxes size={16} className="text-brand" />Склад</div>
              {lowCount > 0 && <span className="text-xs font-bold bg-brand text-white rounded-full px-2 py-0.5">{lowCount} ниже мин.</span>}
            </div>
            <div className="text-2xl font-extrabold text-ink leading-none"><CountUp value={stockValue} suffix=" ₽" /></div>
            <p className="text-xs text-muted mt-1">замороженный в запасах капитал</p>
            <button onClick={() => go('ownerWarehouse')} className="mt-2 text-sm font-bold text-brand inline-flex items-center gap-1">Склад · финансы<ArrowRight size={14} /></button>
          </Card>

          {/* парк техники · телематика */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-ink flex items-center gap-2"><Radar size={16} className="text-brand" />Парк техники</div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ok"><span className="w-1.5 h-1.5 rounded-full bg-ok" />{FLEET_KPI.inField} в работе</span>
            </div>
            <div className="flex items-end gap-4">
              <div><div className="text-2xl font-extrabold text-ink leading-none"><CountUp value={FLEET_KPI.haToday} /></div><div className="text-xs text-muted mt-1">га за смену</div></div>
              <div><div className="text-2xl font-extrabold text-brand leading-none"><CountUp value={FLEET_KPI.alerts} /></div><div className="text-xs text-muted mt-1">алерта (ГСМ, скорость)</div></div>
            </div>
            <button onClick={() => go('agTelematics')} className="mt-2 text-sm font-bold text-brand inline-flex items-center gap-1">Диспетчерская<ArrowRight size={14} /></button>
          </Card>

          {/* антифрод-контур */}
          <Card className="p-5 bg-risk-soft/30">
            <div className="font-bold text-ink mb-1 flex items-center gap-2"><Radar size={16} className="text-risk" />Антифрод по телеметрии</div>
            <div className="text-2xl font-extrabold text-risk leading-none"><CountUp value={ANTIFRAUD.total} suffix=" ₽" /></div>
            <p className="text-xs text-muted mt-1">выявлено за смену: слив ГСМ + приписки га ({ANTIFRAUD.flagged} механизатора)</p>
            <button onClick={() => go('agTelematics')} className="mt-2 text-sm font-bold text-brand inline-flex items-center gap-1">Выработка · разбор<ArrowRight size={14} /></button>
          </Card>

          {/* ИИ-агроном превью */}
          <Card className="p-5 bg-brand-soft/40">
            <div className="font-bold text-ink mb-1">ИИ-агроном за сезон</div>
            <p className="text-sm text-muted leading-snug">81% рекомендаций выполнено, 92% полей оцифровано.</p>
            <button onClick={() => go('ownerAI')} className="mt-2 text-sm font-bold text-brand inline-flex items-center gap-1">Полный отчёт<ArrowRight size={14} /></button>
          </Card>
        </div>
      </div>
    </div>
  )
}
