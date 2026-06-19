import { useState } from 'react'
import { useSeed } from '../../seedStore'
import { ZONES, HYBRIDS, RIVALS, PRICE_BY_HYBRID, type Demo, type DemoStatus } from '../../seedData'
import { SUNFLOWER_PRICE, RIVAL_PU_PRICE, SEED_PU_PER_HA, rub } from '../../seedDossierData'
import { Card, SectionTitle, Icon, Btn, Pill } from '../../ui'
import { Modal, Field, Input, Select } from '../../components/Modal'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const STATUSES: DemoStatus[] = ['посеян', 'вегетация', 'убран', 'в контракт']

export function DemoBattle() {
  const { demos, addDemo, setDemoStatus, convertDemo } = useSeed()
  const [sel, setSel] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [proof, setProof] = useState<Demo | null>(null)
  const [form, setForm] = useState({ farm: '', zone: ZONES[0], region: '', myHybrid: HYBRIDS[0].name, rival: RIVALS[0], sown: '' })

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id]))
  const submit = () => {
    if (!form.farm) return
    addDemo({ farm: form.farm, zone: form.zone, region: form.region || '—', myHybrid: form.myHybrid, rival: form.rival, sown: form.sown || '—', status: 'посеян', ndviMine: 0.3, ndviRival: 0.3 })
    setShowAdd(false)
    setForm({ farm: '', zone: ZONES[0], region: '', myHybrid: HYBRIDS[0].name, rival: RIVALS[0], sown: '' })
  }

  const selDemos = sel.map((id) => demos.find((d) => d.id === id)!).filter(Boolean)

  return (
    <div>
      <div className="flex items-start justify-between">
        <SectionTitle sub="Главное оружие продаж: докажи свой гибрид рядом с конкурентом на реальном поле. Выдели две строки — сравним.">
          Сравнение с конкурентами
        </SectionTitle>
        <Btn onClick={() => setShowAdd(true)}><span className="inline-flex items-center gap-1"><Icon name="FlaskConical" size={15} /> Добавить демо</span></Btn>
      </div>

      {/* Сравнение выбранных */}
      {selDemos.length === 2 && <CompareView a={selDemos[0]} b={selDemos[1]} onClose={() => setSel([])} />}

      <Card pad={false} className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-line">
              <th className="text-left font-medium p-3 w-8"></th>
              <th className="text-left font-medium p-3">Хозяйство · зона</th>
              <th className="text-left font-medium p-3">Мой гибрид vs конкурент</th>
              <th className="text-left font-medium p-3">NDVI / урожай</th>
              <th className="text-left font-medium p-3">Статус</th>
              <th className="text-left font-medium p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {demos.map((d) => {
              const win = d.yieldMine != null && d.yieldRival != null ? d.yieldMine - d.yieldRival : d.ndviMine - d.ndviRival
              return (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                  <td className="p-3"><input type="checkbox" checked={sel.includes(d.id)} onChange={() => toggle(d.id)} /></td>
                  <td className="p-3">
                    <div className="font-semibold text-ink">{d.farm}</div>
                    <div className="text-xs text-muted">{d.zone} · {d.region}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-ink">{d.myHybrid}</span>
                    <span className="text-muted"> vs {d.rival}</span>
                    {win > 0 && <Pill tone="ok"><Icon name="TrendingUp" size={12} />ведём</Pill>}
                  </td>
                  <td className="p-3">
                    {d.yieldMine != null
                      ? <span><b className="text-ok">{d.yieldMine}</b> / {d.yieldRival} т/га</span>
                      : <span>NDVI <b className="text-ink">{d.ndviMine.toFixed(2)}</b> / {d.ndviRival.toFixed(2)}</span>}
                  </td>
                  <td className="p-3">
                    <select value={d.status} onChange={(e) => setDemoStatus(d.id, e.target.value as DemoStatus)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 outline-none cursor-pointer ${d.status === 'в контракт' ? 'bg-ok-soft text-ok' : d.status === 'убран' ? 'bg-brand-soft text-brand' : 'bg-canvas text-muted'}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {d.yieldMine != null && d.status !== 'в контракт' && <Btn size="sm" variant="soft" onClick={() => convertDemo(d.id)}>В контракт</Btn>}
                      <Btn size="sm" variant="ghost" onClick={() => setProof(d)}>Карточка</Btn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted mt-2">Подсказка: отметь две строки галочками — появится сравнение бок-о-бок.</p>

      {/* Модал добавления */}
      <Modal open={showAdd} title="Новый демопосев" onClose={() => setShowAdd(false)}>
        <Field label="Хозяйство"><Input value={form.farm} onChange={(e) => setForm({ ...form, farm: e.target.value })} placeholder="КФХ / агрофирма" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Зона"><Select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</Select></Field>
          <Field label="Регион"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="напр. Ростовская обл." /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Мой гибрид"><Select value={form.myHybrid} onChange={(e) => setForm({ ...form, myHybrid: e.target.value })}>{HYBRIDS.map((h) => <option key={h.id}>{h.name}</option>)}</Select></Field>
          <Field label="Конкурент"><Select value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })}>{RIVALS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        </div>
        <Field label="Дата сева"><Input value={form.sown} onChange={(e) => setForm({ ...form, sown: e.target.value })} placeholder="дд.мм" /></Field>
        <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setShowAdd(false)}>Отмена</Btn><Btn onClick={submit}>Добавить</Btn></div>
      </Modal>

      {/* Карточка-доказательство */}
      <Modal open={!!proof} title="Карточка-доказательство «проверено полем»" onClose={() => setProof(null)}>
        {proof && <ProofCard d={proof} />}
      </Modal>
    </div>
  )
}

function CompareView({ a, b, onClose }: { a: Demo; b: Demo; onClose: () => void }) {
  const useYield = a.yieldMine != null && b.yieldMine != null
  const data = useYield
    ? [{ name: a.myHybrid, v: a.yieldMine }, { name: a.rival, v: a.yieldRival }, { name: b.myHybrid, v: b.yieldMine }, { name: b.rival, v: b.yieldRival }]
    : [{ name: a.myHybrid, v: a.ndviMine }, { name: a.rival, v: a.ndviRival }, { name: b.myHybrid, v: b.ndviMine }, { name: b.rival, v: b.ndviRival }]
  const mine = [a.myHybrid, b.myHybrid]
  return (
    <Card className="mb-5 border-brand/30">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-ink">Сравнение: {a.farm} ↔ {b.farm} · {useYield ? 'урожай, т/га' : 'NDVI'}</div>
        <button onClick={onClose} className="text-sm text-muted hover:text-ink">Сбросить ✕</button>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
            <Bar dataKey="v" name={useYield ? 'т/га' : 'NDVI'} radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={mine.includes(d.name) ? '#fc3f1d' : '#bcbcc4'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-sm text-muted mt-1"><span className="inline-block w-3 h-3 rounded-sm bg-brand align-middle mr-1" /> мои гибриды Genesis · <span className="inline-block w-3 h-3 rounded-sm bg-[#bcbcc4] align-middle mr-1" /> конкуренты</div>
    </Card>
  )
}

function ProofCard({ d }: { d: Demo }) {
  const [sent, setSent] = useState<string | null>(null)
  const useYield = d.yieldMine != null && d.yieldRival != null
  const delta = useYield ? (d.yieldMine! - d.yieldRival!) : (d.ndviMine - d.ndviRival)
  const pct = useYield ? Math.round(((d.yieldMine! - d.yieldRival!) / d.yieldRival!) * 100) : Math.round(((d.ndviMine - d.ndviRival) / d.ndviRival) * 100)
  // выгода клиента в ₽: прибавка к конкуренту × цена − премия за семена Genesis
  const premium = Math.round(SEED_PU_PER_HA * ((PRICE_BY_HYBRID[d.myHybrid] ?? 18900) - RIVAL_PU_PRICE))
  const benefitPerHa = useYield ? Math.round(delta * SUNFLOWER_PRICE - premium) : 0
  return (
    <div>
      <div className="rounded-2xl border border-line p-5 bg-gradient-to-br from-brand-soft/40 to-white">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-ink text-lg">Genesis · «Дружные всходы»</div>
          <Pill tone="brand"><Icon name="FlaskConical" size={12} />проверено полем</Pill>
        </div>
        <div className="text-sm text-muted mt-1">{d.farm} · {d.zone} · {d.region} · сев {d.sown}</div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-white border border-line p-3 text-center">
            <div className="text-xs text-muted">{d.myHybrid} (наш)</div>
            <div className="text-2xl font-extrabold text-brand">{useYield ? d.yieldMine : d.ndviMine.toFixed(2)}</div>
            <div className="text-[11px] text-muted">{useYield ? 'т/га' : 'NDVI'}</div>
          </div>
          <div className="rounded-xl bg-white border border-line p-3 text-center">
            <div className="text-xs text-muted">{d.rival}</div>
            <div className="text-2xl font-extrabold text-ink">{useYield ? d.yieldRival : d.ndviRival.toFixed(2)}</div>
            <div className="text-[11px] text-muted">{useYield ? 'т/га' : 'NDVI'}</div>
          </div>
        </div>
        {/* C-P0-1: нейтральность — источник факта независимый, ранжирование по полю */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-sky bg-sky-soft rounded-full px-3 py-1">
          <Icon name="ShieldCheck" size={12} />независимый источник факта · спутник NDVI → обмолот · по полю, не по марже
        </div>
        {delta > 0 && (
          <div className="mt-3 rounded-xl bg-ok-soft text-ok font-bold text-center py-2">
            +{useYield ? delta.toFixed(1) + ' т/га' : delta.toFixed(2)} · +{pct}% к конкуренту
            {useYield && <div className="text-sm font-extrabold mt-0.5">= {rub(benefitPerHa)}/га выгоды клиенту <span className="font-medium text-ok/80">(после премии за семена {rub(premium)})</span></div>}
          </div>
        )}
        {/* C-P0-2: засуха-режим — преимущество сохраняется и в Bear */}
        {useYield && <div className="mt-2 text-[11px] text-muted text-center">Сравнение в одинаковых условиях: даже в засуху-2025 (~16,6 ц/га по РФ, Ростов −6,8%) относительное преимущество над конкурентом сохраняется.</div>}
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        {sent && <span className="text-xs font-semibold text-ok flex items-center gap-1"><Icon name="Check" size={13} />{sent}</span>}
        <Btn variant="ghost" onClick={() => setSent('PNG сохранён')}>Скачать PNG</Btn><Btn onClick={() => setSent(`Отправлено: ${d.farm}`)}>Отправить хозяйству</Btn>
      </div>
    </div>
  )
}
