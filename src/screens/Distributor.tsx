import { useState } from 'react'
import { DIST_CLIENTS } from '../data'
import { useMarket, type MarketRequest, type MarketReqStatus } from '../marketStore'
import { Card, SectionTitle, Icon, Pill, Stat } from '../ui'
import { CountUp } from '../components/Delight'
import { Inbox, FlaskConical, Droplets, Tractor, Cpu, ChevronRight, Wallet } from 'lucide-react'

const CAT_ICON: Record<string, typeof FlaskConical> = { 'СЗР': FlaskConical, 'Удобрения': Droplets, 'Техника': Tractor, 'Софт': Cpu, 'Семена': Droplets }
const stTone = (s: MarketReqStatus) => s === 'новая' ? 'brand' : s === 'закрыта' ? 'ok' : 'sky'

// финтех-отсрочка: скоринг поля → лимит → ставка (U7, демо)
const FINANCE_ROWS = [
  { farm: 'Агрофирма «Заря»', ha: 4200, score: 786, limitMln: 18, rate: 14 },
  { farm: 'КФХ Сергеев', ha: 800, score: 712, limitMln: 3.2, rate: 17 },
  { farm: 'ООО «Колос»', ha: 2600, score: 668, limitMln: 7.5, rate: 19 },
  { farm: 'КФХ Доброполье', ha: 1800, score: 744, limitMln: 5.6, rate: 16 },
]

export function Distributor() {
  const { requests, newCount, setStatus } = useMarket()
  const [issued, setIssued] = useState<Set<string>>(new Set())
  const inWork = requests.filter((r) => r.status === 'в работе' || r.status === 'предложение').length

  return (
    <div className="max-w-4xl">
      <SectionTitle sub="Вы — партнёр, а не вытесняемый. Заявки из маркетплейса, лиды от ассистента, финтех как ваш инструмент отсрочки.">
        Кабинет дистрибьютора · входы по Югу
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card><Stat value={<CountUp value={newCount} />} label="новых заявок из маркетплейса" accent /></Card>
        <Card><Stat value={<CountUp value={inWork} />} label="в работе" /></Card>
        <Card><Stat value="60+" label="хозяйств в работе" /></Card>
        <Card><Stat value="ваша" label="товарная маржа · take с логистики/лида" /></Card>
      </div>

      {/* заявки из маркетплейса */}
      <Card className="mb-5">
        <div className="font-bold text-ink mb-3 flex items-center gap-2"><Inbox size={17} className="text-brand" />Заявки от агрономов (из маркетплейса)</div>
        <div className="space-y-2">
          {requests.map((r) => <ReqCard key={r.id} r={r} onStatus={setStatus} />)}
          {!requests.length && <div className="text-sm text-muted py-3">Заявок пока нет — агроном оставит их в «Маркетплейсе».</div>}
        </div>
      </Card>

      <Card className="mb-5">
        <div className="font-bold text-ink mb-3">Ваши хозяйства и лиды</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs"><th className="text-left font-medium pb-2">Хозяйство</th><th className="text-left font-medium pb-2">Площадь</th><th className="text-left font-medium pb-2">Потребность</th><th className="text-left font-medium pb-2">Статус</th></tr></thead>
          <tbody>
            {DIST_CLIENTS.map((c) => (
              <tr key={c.name} className="border-t border-line">
                <td className="py-2.5 font-semibold text-ink">{c.name}</td>
                <td className="py-2.5">{c.ha.toLocaleString('ru-RU')} га</td>
                <td className="py-2.5 text-muted">{c.lead}</td>
                <td className="py-2.5"><Pill tone={c.status.includes('Лид') ? 'brand' : c.status.includes('Отсрочка') ? 'sky' : 'ok'}>{c.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* финтех-отсрочка — ваш инструмент (U7) */}
      <Card pad={false} className="overflow-hidden mb-5">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="font-bold text-ink flex items-center gap-2"><Wallet size={17} className="text-brand" />Финтех · товарная отсрочка под скоринг поля</div>
          <span className="text-xs text-muted">скоринг = NDVI-история + кадастр · вы кредитуете дешевле и безопаснее</span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Хозяйство</th><th className="text-right font-medium p-3">Площадь</th>
            <th className="text-right font-medium p-3">Скоринг поля</th><th className="text-right font-medium p-3">Лимит отсрочки</th>
            <th className="text-right font-medium p-3">Ставка</th><th className="text-left font-medium p-3">Действие</th>
          </tr></thead>
          <tbody>
            {FINANCE_ROWS.map((r) => {
              const on = issued.has(r.farm)
              return (
                <tr key={r.farm} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="p-3 font-semibold text-ink">{r.farm}</td>
                  <td className="p-3 text-right text-muted">{r.ha.toLocaleString('ru-RU')} га</td>
                  <td className="p-3 text-right"><span className="font-bold" style={{ color: r.score >= 740 ? '#2da84f' : r.score >= 700 ? '#e0900a' : '#e5302a' }}>{r.score}</span></td>
                  <td className="p-3 text-right font-semibold text-ink">{r.limitMln} млн ₽</td>
                  <td className="p-3 text-right text-muted">{r.rate}%</td>
                  <td className="p-3">{on
                    ? <span className="inline-flex items-center gap-1 text-xs text-ok font-semibold"><Icon name="Check" size={13} />отсрочка оформлена</span>
                    : <button onClick={() => setIssued((s) => new Set(s).add(r.farm))} className="text-xs font-semibold text-white bg-brand rounded-lg px-3 py-1.5">Оформить отсрочку</button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <div className="px-4 py-2 text-[11px] text-muted">Платформа берёт take со скоринга/страховки, не с вашей товарной маржи. Обеспечение — будущий урожай поля (риск-данные).</div>
      </Card>

      <Card className="bg-ok-soft/40 border-ok/30">
        <div className="flex items-start gap-3">
          <Icon name="ShieldCheck" size={22} className="text-ok mt-0.5" />
          <div>
            <div className="font-bold text-ink">Правила платформы для дистрибьютора</div>
            <ul className="text-sm text-muted mt-1 space-y-1">
              <li>• Клиент, пришедший с вами, не уводится на прямой контракт.</li>
              <li>• Финтех-отсрочка — ваш инструмент: кредитуете дешевле под скоринг поля.</li>
              <li>• Комиссия платформы — с логистики/лида, а не с вашей товарной маржи.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ReqCard({ r, onStatus }: { r: MarketRequest; onStatus: (id: string, s: MarketReqStatus) => void }) {
  const I = CAT_ICON[r.category] || FlaskConical
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-canvas grid place-items-center text-muted shrink-0"><I size={15} /></div>
          <div>
            <div className="font-semibold text-ink">{r.product} <span className="text-xs text-muted font-normal">· {r.brand}</span> <span className="text-[10px] font-bold text-brand bg-brand-soft px-1.5 py-0.5 rounded">{r.category}</span></div>
            <div className="text-xs text-muted">{r.farm} · {r.agronom} · {r.region}{r.detail && ` · ${r.detail}`}</div>
          </div>
        </div>
        <Pill tone={stTone(r.status)}>{r.status}</Pill>
      </div>
      <div className="flex items-center gap-2 mt-2.5 ml-[42px]">
        {r.status === 'новая' && <>
          <button onClick={() => onStatus(r.id, 'в работе')} className="text-xs font-semibold text-white bg-brand px-3 py-1.5 rounded-lg">Взять в работу</button>
          <button onClick={() => onStatus(r.id, 'закрыта')} className="text-xs font-semibold text-muted hover:text-ink px-1.5">Отклонить</button>
        </>}
        {r.status === 'в работе' && <button onClick={() => onStatus(r.id, 'предложение')} className="flex items-center gap-1 text-xs font-semibold text-sky bg-sky-soft px-3 py-1.5 rounded-lg">Отправить предложение <ChevronRight size={13} /></button>}
        {r.status === 'предложение' && <button onClick={() => onStatus(r.id, 'закрыта')} className="flex items-center gap-1 text-xs font-semibold text-ok bg-ok-soft px-3 py-1.5 rounded-lg">Закрыть сделку <ChevronRight size={13} /></button>}
        {r.status === 'закрыта' && <span className="text-xs text-muted">обработана</span>}
      </div>
    </div>
  )
}
