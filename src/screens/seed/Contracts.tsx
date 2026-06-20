import { useState } from 'react'
import { useSeed } from '../../seedStore'
import { HYBRIDS, type Contract } from '../../seedData'
import { clientEconomics, rub } from '../../seedDossierData'
import { Card, SectionTitle, Icon, Btn, Pill, Stat } from '../../ui'
import { Tabs } from '../../components/Tabs'
import { Modal, Field, Input } from '../../components/Modal'
import { fireConfetti, CountUp } from '../../components/Delight'
import { useToast } from '../../components/Toast'

const money = (n: number) => (n / 1_000_000).toFixed(2) + ' млн ₽'

function settlement(c: Contract) {
  const total = c.pu * c.pricePerPU
  const prepaid = total * (c.prepaidPct / 100)
  const factor = c.actualYield != null ? c.actualYield / c.expectedYield : 1
  const remaining = (total - prepaid) * factor // остаток масштабируется по факту урожая
  return { total, prepaid, remaining }
}

export function Contracts() {
  const { contracts, lots, demos, leads, fields, settleContract, verifyLot } = useSeed()
  const toast = useToast()
  const [tab, setTab] = useState('rs')
  const [settle, setSettle] = useState<Contract | null>(null)
  const [actual, setActual] = useState('')
  const [reglOpen, setReglOpen] = useState(false)

  // зона хозяйства — из имеющихся данных клиента, иначе из зон гибрида
  const zoneOf = (farm: string, hybrid: string) =>
    leads.find((l) => l.farm === farm)?.zone ?? demos.find((d) => d.farm === farm)?.zone ?? fields.find((f) => f.farm === farm)?.zone ?? HYBRIDS.find((h) => h.name === hybrid)?.zones[0] ?? 'Юг (богара)'
  // выгода клиента по контракту: прибавка к медиане района × площадь − премия за семена
  const clientBenefit = (c: Contract, yieldVal: number) => {
    const eco = clientEconomics(zoneOf(c.farm, c.hybrid), yieldVal, c.pricePerPU)
    return { eco, total: Math.round(eco.benefit * c.areaHa) }
  }

  const agg = contracts.reduce((a, c) => { const s = settlement(c); a.total += s.total; a.prepaid += s.prepaid; a.remaining += s.remaining; return a }, { total: 0, prepaid: 0, remaining: 0 })
  const clientValue = contracts.reduce((a, c) => a + clientBenefit(c, c.actualYield ?? c.expectedYield).total, 0)
  const claims = lots.reduce((s, l) => s + l.claims, 0)

  return (
    <div>
      <SectionTitle sub="Доверие в цифре: риск-шеринг 60%+по факту (платформа видит урожай) и защита подлинности партий.">
        Контракты · партии
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card><Stat value={<CountUp value={agg.total / 1_000_000} decimals={2} suffix=" млн ₽" />} label={`законтрактовано · ${contracts.length} сделки`} /></Card>
        <Card><Stat value={<CountUp value={agg.prepaid / 1_000_000} decimals={2} suffix=" млн ₽" />} label="авансы получено (60%)" /></Card>
        <Card><Stat value={<CountUp value={agg.remaining / 1_000_000} decimals={2} suffix=" млн ₽" />} label="доплата по факту (прогноз)" accent /></Card>
        <Card><Stat value={`${lots.filter((l) => l.verified).length}/${lots.length}`} label={claims ? `партий подтверждено · ${claims} жалобы` : 'партий подтверждено'} /></Card>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'rs', label: 'Риск-шеринг' }, { key: 'lots', label: 'Партии · подлинность' }]} />

      {tab === 'rs' && (
        <Card pad={false} className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-muted text-xs border-b border-line">
              <th className="text-left font-medium p-3">Хозяйство · гибрид</th>
              <th className="text-right font-medium p-3">Сумма</th>
              <th className="text-right font-medium p-3">Аванс 60%</th>
              <th className="text-left font-medium p-3">Урожай ожид/факт</th>
              <th className="text-right font-medium p-3">Остаток по факту</th>
              <th className="text-right font-medium p-3" title="Прибавка к медиане района × площадь − премия за семена">Выгода клиента</th>
              <th className="text-left font-medium p-3">Статус</th>
            </tr></thead>
            <tbody>
              {contracts.map((c) => {
                const s = settlement(c)
                const cb = clientBenefit(c, c.actualYield ?? c.expectedYield)
                const pos = cb.eco.benefit > 0
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                    <td className="p-3"><div className="font-semibold text-ink">{c.farm}</div><div className="text-xs text-muted">{c.hybrid} · {c.areaHa} га · {c.pu} п.е.</div></td>
                    <td className="p-3 text-right">{money(s.total)}</td>
                    <td className="p-3 text-right text-muted">{money(s.prepaid)}</td>
                    <td className="p-3">{c.expectedYield} / {c.actualYield != null ? <b className="text-ink">{c.actualYield}</b> : '—'} т/га</td>
                    <td className="p-3 text-right font-bold" style={{ color: c.actualYield != null ? (c.actualYield >= c.expectedYield ? '#2da84f' : '#e0900a') : '#6b6b6b' }}>{money(s.remaining)}</td>
                    <td className="p-3 text-right"><div className="font-semibold" style={{ color: pos ? '#2da84f' : '#e5302a' }}>{rub(cb.total)}</div><div className="text-[10px] text-muted">{rub(cb.eco.benefit)}/га{c.actualYield == null ? ' · прогноз' : ''}</div></td>
                    <td className="p-3">
                      {c.status === 'закрыт'
                        ? <Pill tone="ok">закрыт</Pill>
                        : c.status === 'расчёт по факту'
                          ? <Btn size="sm" variant="soft" onClick={() => { setSettle(c); setActual(String(c.actualYield ?? c.expectedYield)) }}>Рассчитать</Btn>
                          : <Pill tone="gray">{c.status}</Pill>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </Card>
      )}

      {tab === 'rs' && (
        <Card className="mt-4 bg-ok-soft/40 border-ok/30">
          <div className="flex items-center gap-3 text-sm text-muted"><Icon name="ShieldCheck" size={18} className="text-ok" />
            <span>Остаток доплаты <b className="text-ink">масштабируется по фактическому урожаю</b> (платформа видит его со спутника/датчиков) — хозяйство не рискует предоплатой. При этом по контрактам клиенты заработали <b className="text-ok">{rub(clientValue)}</b> сверх цены семян: семена окупаются, а риск-шеринг снимает барьер №1 продаж.</span></div>
        </Card>
      )}

      {tab === 'lots' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lots.map((l) => (
            <Card key={l.id} className="flex items-center gap-4">
              {/* штрих-код партии (прослеживаемость) */}
              <div className="w-16 h-16 rounded-lg border border-line grid place-items-center shrink-0 bg-white p-2" title={`Штрих-код партии ${l.batch}`}>
                <div className="flex items-stretch gap-[1px] w-full h-9">
                  {Array.from({ length: 20 }).map((_, i) => <span key={i} className="bg-ink h-full" style={{ width: ((l.batch.charCodeAt(i % l.batch.length) + i) % 3) + 1 }} />)}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-ink">{l.hybrid}</div>
                <div className="text-xs text-muted">Партия {l.batch} · {l.pu.toLocaleString('ru-RU')} п.е.</div>
                <div className="text-xs text-muted">{l.plot}</div>
                <div className="mt-2 flex items-center gap-2">
                  {l.verified
                    ? <Pill tone="ok"><Icon name="Check" size={12} />подлинность подтверждена</Pill>
                    : <Btn size="sm" variant="soft" onClick={() => verifyLot(l.id)}>Верифицировать</Btn>}
                  {l.claims > 0 && <Pill tone="brand">{l.claims} жалобы на контрафакт</Pill>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!settle} title="Расчёт по факту урожая" onClose={() => setSettle(null)}>
        {settle && (
          <div>
            <div className="text-sm text-muted mb-3">{settle.farm} · {settle.hybrid} · ожидали {settle.expectedYield} т/га</div>
            <Field label="Фактический урожай, т/га"><Input value={actual} onChange={(e) => setActual(e.target.value)} type="number" step="0.1" /></Field>
            <div className="rounded-xl border border-ok/30 bg-ok-soft/30 p-2.5 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink"><Icon name="ShieldCheck" size={13} className="text-ok" />Источник факта урожая · приоритет</div>
                <button onClick={() => setReglOpen(true)} className="text-[11px] font-semibold text-brand">Регламент →</button>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5"><span className="w-4 text-center font-bold text-ok">1</span><b className="text-ink">Весовая / обмолот (элеватор)</b><Pill tone="ok">независимо</Pill><span className="text-muted">первичка — на ней считаем</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 text-center font-bold text-ok">2</span><b className="text-ink">Независимый акт на уборке</b><Pill tone="sky">независимо</Pill><span className="text-muted">замерщик, оплата 50/50</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 text-center font-bold text-muted">3</span>Спутник: NDVI → биомасса<Pill tone="gray">расчёт ±15%</Pill><span className="text-muted">кросс-проверка, не основа</span></div>
              </div>
              <div className="text-[10px] text-muted mt-1.5">Расхождение источников &gt;10% → ручной пересчёт по весовой. Спутник — вспомогательный сигнал, а не основа расчёта денег.</div>
            </div>
            {(() => {
              const y = parseFloat(actual) || settle.expectedYield
              const cb = clientBenefit(settle, y)
              return (
                <div className="rounded-xl bg-canvas p-3 text-sm space-y-1.5">
                  <div className="flex items-center justify-between">Остаток к доплате Genesis: <b className="text-ink">{money(settlement({ ...settle, actualYield: y }).remaining)}</b></div>
                  <div className="flex items-center justify-between border-t border-line pt-1.5">Выгода клиента при факте: <b style={{ color: cb.eco.benefit > 0 ? '#2da84f' : '#e5302a' }}>{rub(cb.total)} ({rub(cb.eco.benefit)}/га)</b></div>
                  <div className="text-[11px] text-muted">{cb.eco.benefit > 0
                    ? 'Клиент в плюсе сверх цены семян даже при недоборе — а доплата нам падает пропорционально. Обе стороны делят риск.'
                    : 'При таком факте прибавки к медиане района нет — клиент в минусе, но доплата нам тоже падает по факту (риск делим, не только хозяйство).'}</div>
                </div>
              )
            })()}
            <div className="flex justify-end gap-2 mt-3"><Btn variant="ghost" onClick={() => setSettle(null)}>Отмена</Btn><Btn onClick={() => { settleContract(settle.id, parseFloat(actual) || settle.expectedYield); const farm = settle.farm; setSettle(null); fireConfetti(); toast(`Контракт закрыт по факту урожая · ${farm}`) }}>Закрыть контракт</Btn></div>
          </div>
        )}
      </Modal>

      <Modal open={reglOpen} title="Регламент факта урожая" onClose={() => setReglOpen(false)}>
        <div className="text-sm space-y-2.5">
          <p className="text-muted">Подписанный сторонами порядок определения факта урожая для риск-шеринга — чтобы «факт» не был словом поставщика или картинкой со спутника.</p>
          {[
            ['Что считается фактом', 'Бункерный вес или акт обмолота элеватора по убранной площади поля, приведённый к стандартной влажности и засорённости.'],
            ['Кто фиксирует', 'Уборку сопровождает независимый замерщик (агроном-эксперт из реестра платформы, не сотрудник Genesis и не хозяйства). Геопривязка + фото.'],
            ['Кто платит замерщику', 'Стоимость независимого акта делится 50/50 между Genesis и хозяйством (фикс за поле). Платформа в оплате замерщика не участвует — нет конфликта интересов.'],
            ['Роль спутника', 'NDVI→биомасса — только кросс-проверка (ошибка ±15%). На спутнике деньги не считаются.'],
            ['Спор по расхождению', 'Расхождение весовая↔акт >10% → повторный замер за счёт инициатора спора; при сохранении расхождения берётся весовая элеватора как приоритет.'],
            ['Ответственность', 'Поставщик данных платформы несёт SLA на корректность передачи; намеренное искажение факта → расторжение и неустойка по договору риск-шеринга.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-canvas p-2.5"><div className="font-semibold text-ink text-sm">{t}</div><div className="text-xs text-muted mt-0.5">{d}</div></div>
          ))}
          <div className="flex justify-end"><Btn onClick={() => setReglOpen(false)}>Понятно</Btn></div>
        </div>
      </Modal>
    </div>
  )
}
