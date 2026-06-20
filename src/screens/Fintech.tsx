import { useState } from 'react'
import { useApp } from '../store'
import { Card, SectionTitle, Icon, Pill, Stat, Btn } from '../ui'
import { Locked } from '../components/Locked'
import { backtest } from '../seedRndData'

// залоговые поля с реальной привязкой ЕГРН↔право↔ИНН + антидубль (U8, демо-данные)
const PLEDGE_ROWS = [
  { farm: 'КФХ Доброполье', egrn: '61:02:0600006:418', right: 'собственность', inn: '6125003217', dup: false },
  { farm: 'Агрохолдинг «Сальский»', egrn: '61:34:0010204:77', right: 'аренда 11 лет', inn: '6153002841', dup: false },
  { farm: 'ООО «Кубань-Олео»', egrn: '23:43:0107001:512', right: 'собственность', inn: '2310099887', dup: true },
  { farm: 'КФХ Прикумье', egrn: '26:24:0301015:204', right: 'аренда 5 лет', inn: '2609800341', dup: false },
]

function BankView() {
  const bt = backtest()
  const droughtMape = bt.bySeason.find((s) => s.type === 'засуха')!.mape
  const contour: { label: string; status: 'ok' | 'warn' | 'risk'; note: string }[] = [
    { label: 'Кадастр ЕГРН ↔ право ↔ ИНН', status: 'warn', note: 'есть на пилотных полях, не на всём пуле' },
    { label: 'Антидубль залога', status: 'ok', note: '1 поле помечено как заложенное дважды' },
    { label: 'Валидация прогноз vs факт', status: 'warn', note: `MAPE ${bt.mape}% · засуха ${droughtMape}% (хуже)` },
    { label: 'Покрытие пула / репрезентативность', status: 'risk', note: 'мок-выборка, не пул залогов' },
    { label: 'Регуляторика 260-ФЗ / НСА / ЦБ', status: 'risk', note: 'контур не построен — слайд' },
  ]
  const tone = (s: string) => s === 'ok' ? 'text-ok' : s === 'warn' ? 'text-warn' : 'text-risk'
  return (
    <div>
      <SectionTitle sub="Верифицированная «память о земле» как сырьё для скоринга и страхования. Линза Дорохина (фин-инструменты).">
        Риск-данные для банка / страховщика
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card><Stat value="поле↔кадастр↔юрлицо" label="привязка для скоринга" /></Card>
        <Card><Stat value="3 сезона" label="история урожайности залога" /></Card>
        <Card><Stat value="ед. млрд ₽/год" label="пул институтов (РФ)" accent /></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <div className="font-bold text-ink mb-2">Что даём институту</div>
          <ul className="text-sm text-muted space-y-2">
            <li className="flex gap-2"><Icon name="Check" size={16} className="text-ok mt-0.5" />NDVI-мониторинг залоговых полей</li>
            <li className="flex gap-2"><Icon name="Check" size={16} className="text-ok mt-0.5" />История урожайности + подтверждённый через Финтех денежный поток</li>
            <li className="flex gap-2"><Icon name="Check" size={16} className="text-ok mt-0.5" />Параметрическое страхование (засуха/НДВ)</li>
          </ul>
        </Card>
        <Card className="bg-warn-soft/40 border-warn/30">
          <div className="font-bold text-ink mb-2 flex items-center gap-2"><Icon name="AlertTriangle" size={18} className="text-warn" />Барьер: верификация</div>
          <p className="text-sm text-muted">Для кредитного/страхового решения нужны data lineage, валидация «прогноз vs факт», покрытие/репрезентативность и регуляторный контур (260-ФЗ/НСА, требования ЦБ к моделям). Без этого — только пилот.</p>
        </Card>
      </div>

      {/* контур верификации залога (U8) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
        <Card className="col-span-1">
          <div className="font-bold text-ink mb-2">Контур верификации (статус)</div>
          <div className="space-y-1.5">
            {contour.map((c) => (
              <div key={c.label} className="flex items-start gap-2 text-sm">
                <Icon name={c.status === 'ok' ? 'Check' : 'AlertTriangle'} size={14} className={`${tone(c.status)} mt-0.5 shrink-0`} />
                <div><span className="text-ink">{c.label}</span><div className="text-[11px] text-muted">{c.note}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card pad={false} className="col-span-2 overflow-hidden">
          <div className="p-4 pb-2 font-bold text-ink">Привязка залоговых полей · ЕГРН ↔ право ↔ ИНН</div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-muted text-xs border-b border-line">
              <th className="text-left font-medium p-3">Хозяйство</th><th className="text-left font-medium p-3">Кадастр (ЕГРН)</th>
              <th className="text-left font-medium p-3">Право</th><th className="text-left font-medium p-3">ИНН</th><th className="text-left font-medium p-3">Антидубль</th>
            </tr></thead>
            <tbody>
              {PLEDGE_ROWS.map((r) => (
                <tr key={r.egrn} className="border-b border-line last:border-0">
                  <td className="p-3 font-semibold text-ink">{r.farm}</td>
                  <td className="p-3 text-muted text-xs">{r.egrn}</td>
                  <td className="p-3 text-muted text-xs">{r.right}</td>
                  <td className="p-3 text-muted text-xs">{r.inn}</td>
                  <td className="p-3">{r.dup ? <Pill tone="brand"><Icon name="AlertTriangle" size={11} />заложено дважды</Pill> : <Pill tone="ok"><Icon name="Check" size={11} />чисто</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-4 py-2 text-[11px] text-muted">Демо-данные. Для решения нужен реальный ЕГРН↔Росреестр↔ИНН по всему пулу + валидация прогноз/факт на истории.</div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="font-bold text-ink mb-3">Стадийная монетизация</div>
        <div className="flex items-center gap-2 text-sm">
          <Pill tone="sky">1 · data feed</Pill><Icon name="ChevronRight" size={14} className="text-muted" />
          <Pill tone="sky">2 · скоринг-as-a-service</Pill><Icon name="ChevronRight" size={14} className="text-muted" />
          <Pill tone="sky">3 · success-fee на премиях/NPA</Pill>
        </div>
      </Card>
    </div>
  )
}

function OwnerView() {
  const [sent, setSent] = useState(false)
  return (
    <Locked tier="pro">
      <SectionTitle sub="Финансирование закупок и страхование урожая на основе данных поля">
        Финтех · страховка
      </SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="flex items-center gap-2 mb-1"><Icon name="ShieldCheck" size={18} className="text-brand" /><span className="font-bold text-ink">Параметрическая страховка</span></div><p className="text-sm text-muted">Выплата по факту засухи/НДВ без долгих экспертиз.</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><Icon name="Landmark" size={18} className="text-brand" /><span className="font-bold text-ink">Финансирование закупок</span></div><p className="text-sm text-muted">Отсрочка под скоринг поля — в т.ч. через вашего дистрибьютора.</p></Card>
        <Card><div className="flex items-center gap-2 mb-1"><Icon name="Wallet" size={18} className="text-brand" /><span className="font-bold text-ink">Скоринг хозяйства</span></div><p className="text-sm text-muted">История поля = более дешёвый кредит.</p></Card>
      </div>
      <div className="mt-5 flex items-center gap-3"><Btn onClick={() => setSent(true)}>Подать заявку на финансирование</Btn>{sent && <span className="text-sm font-semibold text-ok flex items-center gap-1"><Icon name="Check" size={14} />Заявка отправлена — менеджер свяжется</span>}</div>
    </Locked>
  )
}

export function Fintech() {
  const { role } = useApp()
  return role === 'bank' ? <BankView /> : <OwnerView />
}
