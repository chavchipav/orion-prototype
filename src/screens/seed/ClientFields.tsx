import { useState } from 'react'
import { useSeed } from '../../seedStore'
import { HYBRIDS, ZONES, AGRONOMS, PRICE_BY_HYBRID, type ClientField, type SeedTask } from '../../seedData'
import { clientEconomics, rub } from '../../seedDossierData'
import { REGION_NDVI } from '../../agronomData'
import { Card, SectionTitle, Btn, StatusChip } from '../../ui'
import { Tabs } from '../../components/Tabs'
import { SeedMap } from './SeedMap'
import { Modal, Field, Input, Select } from '../../components/Modal'
import { FieldThumb, Sparkline, ndviSeries } from '../../components/FieldGlance'
import { useToast } from '../../components/Toast'
import { CLIENT_GEO } from '../../seedFieldsGeo'
import type { LatLng } from '../../components/MapKit'
import { Wallet, Sprout, ShieldCheck } from 'lucide-react'
import { hash as fhash } from '../../utils'

const ringOf = (f: ClientField): LatLng[] => (CLIENT_GEO[f.id]?.ring as LatLng[]) || []

// Урожай поля = proven гибрида в зоне × поправка на NDVI поля vs медиана района
// (поле в норме даёт ~pasport, отстающее — меньше). Затем экономика клиента.
const SUNFLOWER_NDVI_MEDIAN = REGION_NDVI['Подсолнечник'].median

// согласие хозяйства на шеринг урожайности (152-ФЗ, opt-in) — детерминированно по id поля
function fieldConsent(id: string): boolean { return fhash(id + 'consent') % 10 < 7 } // ~70% дали согласие
function fieldEco(f: ClientField) {
  const h = HYBRIDS.find((x) => x.name === f.hybrid)
  const proven = h?.proven.find((p) => p.zone === f.zone)?.yield ?? h?.potential ?? 2.8
  const ndviFactor = Math.max(0.7, Math.min(1.2, f.ndvi / SUNFLOWER_NDVI_MEDIAN))
  const fieldYield = +(proven * ndviFactor).toFixed(2)
  const eco = clientEconomics(f.zone, fieldYield, PRICE_BY_HYBRID[f.hybrid] ?? 18900)
  return { eco, fieldYield, total: Math.round(eco.benefit * f.areaHa) }
}

export function ClientFields() {
  const { fields, tasks, addTask, setTaskStatus } = useSeed()
  const toast = useToast()
  const [tab, setTab] = useState('map')
  const [fHybrid, setFHybrid] = useState('все')
  const [fZone, setFZone] = useState('все')
  const [fStatus, setFStatus] = useState('все')
  const [picked, setPicked] = useState<ClientField | null>(null)
  const [taskFor, setTaskFor] = useState<ClientField | null>(null)
  const [taskText, setTaskText] = useState('')
  const [agronom, setAgronom] = useState(AGRONOMS[0])

  const filtered = fields.filter((f) =>
    (fHybrid === 'все' || f.hybrid === fHybrid) &&
    (fZone === 'все' || f.zone === fZone) &&
    (fStatus === 'все' || f.status === fStatus))

  // выгода клиентам от семян Genesis (нетто по всем полям) — продающий итог
  const clientValue = fields.reduce((a, f) => a + fieldEco(f).total, 0)
  const clientHa = fields.reduce((a, f) => a + f.areaHa, 0)

  const openTask = (f: ClientField) => { setTaskFor(f); setTaskText(f.alert ? f.alert : ''); }
  const submitTask = () => {
    if (taskFor) { addTask({ field: `${taskFor.farm} · ${taskFor.region}`, farm: taskFor.farm, text: taskText || 'Выезд агронома', agronom }); toast(`Задача отправлена агроному ${agronom} · ${taskFor.farm}`) }
    setTaskFor(null); setTaskText('')
  }

  return (
    <div>
      <SectionTitle sub="Видишь, как твои семена ведут себя у клиентов, и реагируешь точечно. Закрывает «продал-забыл».">
        Поля клиентов
      </SectionTitle>

      {/* продающий итог: сколько семена Genesis принесли клиентам */}
      <div className="rounded-2xl border border-ok/30 bg-ok-soft/40 p-3.5 mb-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-ok/15 text-ok grid place-items-center shrink-0"><Wallet size={18} /></span>
        <div className="text-sm text-ink flex-1">Семена Genesis принесли клиентам <b className="text-ok">{rub(clientValue)}</b> сверх премии на <b>{clientHa.toLocaleString('ru-RU')} га</b> ({fields.length} полей) — прибавка к медиане района (спутниковый слой) × площадь. Это аргумент на пролонгацию контрактов.</div>
      </div>

      {/* согласие хозяйств на шеринг данных (U2) */}
      {(() => {
        const shared = fields.filter((f) => fieldConsent(f.id)).length
        const pct = fields.length ? Math.round((shared / fields.length) * 100) : 0
        return (
          <div className="rounded-2xl border border-sky/30 bg-sky-soft/30 p-3 mb-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-sky/15 text-sky grid place-items-center shrink-0"><ShieldCheck size={18} /></span>
            <div className="text-sm text-ink flex-1"><b>{shared} из {fields.length} хозяйств ({pct}%)</b> дали согласие на шеринг урожайности (152-ФЗ) — только их данные идут в агрегат «проверено полем». По остальным виден статус «нет согласия» на карточке поля.</div>
          </div>
        )
      })()}

      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'map', label: 'Карта полей' }, { key: 'support', label: `Сопровождение · ${tasks.filter((t) => t.status !== 'закрыта').length}` }]} />

      {tab === 'map' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            <div className="flex gap-2">
              <select value={fHybrid} onChange={(e) => setFHybrid(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
                <option value="все">Все гибриды</option>{HYBRIDS.map((h) => <option key={h.id}>{h.name}</option>)}
              </select>
              <select value={fZone} onChange={(e) => setFZone(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
                <option value="все">Все зоны</option>{ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
                <option value="все">Любой статус</option><option value="ok">Норма</option><option value="warn">Внимание</option><option value="risk">Риск</option>
              </select>
            </div>
            <SeedMap fields={filtered} selected={picked?.id} picked={picked}
              onPick={(id) => setPicked(fields.find((f) => f.id === id) || null)}
              onAssign={(f) => { openTask(f); setPicked(null) }}
              onClose={() => setPicked(null)} height={560} />
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto scroll-thin pr-1">
            {filtered.map((f) => (
              <button key={f.id} onClick={() => setPicked(f)} className="w-full text-left">
                <Card className={`hover:border-brand/40 ${picked?.id === f.id ? 'border-brand' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <FieldThumb ring={ringOf(f)} status={f.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink text-sm truncate">{f.farm}</span>
                        <StatusChip s={f.status} />
                      </div>
                      <div className="text-xs text-muted mt-0.5 truncate">{f.hybrid} · {f.region} · {f.areaHa} га</div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Sparkline values={ndviSeries(f.id, f.ndvi, f.status)} />
                      <span className="text-[10px] text-muted mt-0.5">NDVI {f.ndvi.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-1">{fieldConsent(f.id)
                    ? <span className="text-[10px] font-semibold text-ok bg-ok-soft rounded-full px-1.5 py-0.5">шарит данные ✓</span>
                    : <span className="text-[10px] font-semibold text-warn bg-warn-soft rounded-full px-1.5 py-0.5">нет согласия на шеринг</span>}</div>
                  {(() => { const { eco, total } = fieldEco(f); const pos = eco.benefit > 0; return (
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-line text-xs">
                      <span className="text-muted">выгода клиенту</span>
                      <span className="font-semibold" style={{ color: pos ? '#2da84f' : '#e5302a' }}>{rub(eco.benefit)}/га · {rub(total)}</span>
                    </div>
                  ) })()}
                  {f.alert && <div className="text-xs text-risk mt-1">{f.alert}</div>}
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'support' && (
        <>
        <div className="rounded-2xl border border-brand/25 bg-brand-soft/30 p-3.5 mb-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0"><Sprout size={18} /></span>
          <div className="text-sm text-ink flex-1">Сопровождение идёт <b>под брендом Genesis · «Дружные всходы»</b> — выезды, задачи и контент по моим гибридам атрибутированы мне, а не растворяются в платформе. Это моя услуга и мой бренд.</div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="font-bold text-ink mb-3">Алерты по полям → назначить агронома</div>
            <div className="space-y-2">
              {fields.filter((f) => f.status !== 'ok').map((f) => (
                <Card key={f.id} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: f.status === 'risk' ? '#e5302a' : '#e0900a' }} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{f.farm} · {f.hybrid}</div>
                    <div className="text-xs text-muted">{f.alert}</div>
                  </div>
                  <Btn size="sm" variant="soft" onClick={() => openTask(f)}>+ Задача</Btn>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold text-ink mb-3">Задачи агрономам</div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-ink">{t.text}</div>
                    <select value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value as SeedTask['status'])}
                      className={`text-xs font-semibold rounded-full px-2 py-1 shrink-0 ${t.status === 'закрыта' ? 'bg-ok-soft text-ok' : t.status === 'в работе' ? 'bg-warn-soft text-warn' : 'bg-canvas text-muted'}`}>
                      <option>новая</option><option>в работе</option><option>закрыта</option>
                    </select>
                  </div>
                  <div className="text-xs text-muted mt-1">{t.field} · {t.agronom}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Создание задачи */}
      <Modal open={!!taskFor} title="Задача агроному" onClose={() => setTaskFor(null)}>
        {taskFor && <div className="text-sm text-muted mb-3">{taskFor.farm} · {taskFor.region}</div>}
        <Field label="Что сделать"><Input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="напр. выехать, оценить засуху" /></Field>
        <Field label="Агроном"><Select value={agronom} onChange={(e) => setAgronom(e.target.value)}>{AGRONOMS.map((a) => <option key={a}>{a}</option>)}</Select></Field>
        <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setTaskFor(null)}>Отмена</Btn><Btn onClick={submitTask}>Назначить</Btn></div>
      </Modal>
    </div>
  )
}
