import { useState, type ReactNode } from 'react'
import { useSeed } from '../../seedStore'
import { ZONES, recommendForZone, type Hybrid } from '../../seedData'
import { Card, SectionTitle, Icon, Pill, Btn } from '../../ui'
import { Tabs } from '../../components/Tabs'
import { Modal } from '../../components/Modal'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts'

const regTone = (r: string): 'ok' | 'sky' | 'brand' => (r === 'в реестре' ? 'ok' : r === 'на регистрации' ? 'sky' : 'brand')

// 5 агро-критериев гибрида, нормированные в 0..5 — для лепестковой диаграммы (G5)
const RADAR_AXES = ['Засуха', 'Заразиха', 'Масличность', 'Потенциал', 'Скороспелость'] as const
function hybridMetrics(h: Hybrid): Record<string, number> {
  return {
    'Засуха': h.drought,
    'Заразиха': h.broomrape,
    'Масличность': Math.max(0, Math.min(5, (h.oil - 44) / 1.2)),
    'Потенциал': Math.max(0, Math.min(5, (h.potential - 2.6) / 0.2)),
    'Скороспелость': h.maturity === 'ранний' ? 5 : h.maturity === 'среднеранний' ? 3.5 : 2,
  }
}
// Лепестковая диаграмма: топ-рекомендация против второго варианта под зону
function ZoneRadar({ a, b }: { a: Hybrid; b?: Hybrid }) {
  const ma = hybridMetrics(a), mb = b ? hybridMetrics(b) : null
  const data = RADAR_AXES.map((axis) => ({ axis, a: +ma[axis].toFixed(1), b: mb ? +mb[axis].toFixed(1) : 0 }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e5e5e8" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#5b5b62' }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9, fill: '#9a9aa2' }} tickCount={6} />
        <Radar name={a.name} dataKey="a" stroke="#fc3f1d" fill="#fc3f1d" fillOpacity={0.28} />
        {b && <Radar name={b.name} dataKey="b" stroke="#2563eb" fill="#2563eb" fillOpacity={0.14} />}
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function Dots({ n, color }: { n: number; color: string }) {
  return <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <span key={i} className="w-2 h-2 rounded-full" style={{ background: i <= n ? color : '#e5e5e8' }} />)}</span>
}

export function Hybrids() {
  const { hybrids } = useSeed()
  const [tab, setTab] = useState('reg')
  const [zone, setZone] = useState(ZONES[0])
  const [open, setOpen] = useState<Hybrid | null>(null)
  const ranked = recommendForZone(hybrids, zone)

  return (
    <div>
      <SectionTitle sub="Портфель семян и подбор гибрида под регион, чтобы не повторить «Гелиос-415 на Юге».">
        Мои семена
      </SectionTitle>

      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'reg', label: 'Реестр семян' }, { key: 'zone', label: 'Подбор под регион' }]} />

      {tab === 'reg' && (
        <div className="grid grid-cols-2 gap-4">
          {hybrids.map((h) => (
            <Card key={h.id} className="hover:border-brand/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-ink text-lg">{h.name}{h.clearfield && <Pill tone="sky">Clearfield</Pill>}</div>
                  <div className="text-xs text-muted">{h.maturity} · масличность {h.oil}% · потенциал {h.potential} т/га</div>
                </div>
                <Pill tone={regTone(h.reg)}>{h.reg}</Pill>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted text-xs">Засуха</span><Dots n={h.drought} color="#e0900a" /></div>
                <div className="flex items-center justify-between"><span className="text-muted text-xs">Заразиха</span><Dots n={h.broomrape} color="#2da84f" /></div>
              </div>
              <div className="text-xs text-muted mt-3">Зоны: {h.zones.join(', ')}</div>
              <div className="text-xs text-muted mt-1">R&D: {h.rdStage}</div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-muted">проверено на {h.proven.reduce((s, p) => s + p.fields, 0)} полях</span>
                <Btn size="sm" variant="ghost" onClick={() => setOpen(h)}>Паспорт</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'zone' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-semibold text-ink">Подобрать гибрид для зоны:</span>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm">
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
          {ranked.length > 0 && (
            <Card className="mb-4">
              <div className="font-bold text-ink mb-1">Профиль под зону «{zone}»</div>
              <div className="text-xs text-muted mb-2">Топ-рекомендация против второго варианта по 5 агро-критериям (0–5).</div>
              <ZoneRadar a={ranked[0].h} b={ranked[1]?.h} />
            </Card>
          )}
          <div className="space-y-3">
            {ranked.map(({ h, proven, warn }, i) => (
              <Card key={h.id} className={`flex items-center gap-4 ${i === 0 && !warn ? 'border-ok/40' : warn ? 'border-risk/30' : ''}`}>
                <div className={`w-9 h-9 rounded-xl grid place-items-center font-bold shrink-0 ${i === 0 && !warn ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{i + 1}</div>
                <div className="flex-1">
                  <div className="font-bold text-ink">{h.name} <span className="text-xs text-muted font-normal">· {h.maturity} · засуха</span> <Dots n={h.drought} color="#e0900a" /></div>
                  {proven
                    ? <div className="text-xs text-ok mt-0.5">проверено полем: {proven.yield} т/га на {proven.fields} полях этой зоны</div>
                    : <div className="text-xs text-muted mt-0.5">в этой зоне ещё нет данных «проверено полем»</div>}
                  {warn && <div className="text-xs text-risk mt-0.5 flex items-center gap-1"><Icon name="AlertTriangle" size={12} />{warn}</div>}
                </div>
                {i === 0 && !warn && <Pill tone="ok">рекомендуем</Pill>}
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Рекомендатель учитывает засухоустойчивость (на богаре Юга — с двойным весом), заразиху и доказанный результат в зоне.</p>
        </div>
      )}

      <Modal open={!!open} title={open?.name || ''} onClose={() => setOpen(null)}>
        {open && (
          <div className="text-sm">
            <div className="grid grid-cols-2 gap-2">
              <I k="Срок" v={open.maturity} /><I k="Масличность" v={`${open.oil}%`} />
              <I k="Потенциал" v={`${open.potential} т/га`} /><I k="Регистрация" v={open.reg} />
              <I k="Засухоустойчивость" v={<Dots n={open.drought} color="#e0900a" />} />
              <I k="Заразиха" v={<Dots n={open.broomrape} color="#2da84f" />} />
            </div>
            <div className="mt-3 font-semibold text-ink">Проверено полем</div>
            <table className="w-full mt-1">
              <tbody>
                {open.proven.map((p) => (
                  <tr key={p.zone} className="border-t border-line"><td className="py-1.5 text-muted">{p.zone}</td><td className="py-1.5 text-right font-bold text-ink">{p.yield} т/га</td><td className="py-1.5 text-right text-muted">{p.fields} полей</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 rounded-xl bg-canvas p-3 text-muted text-xs">{open.note}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function I({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted">{k}</span><span className="font-semibold text-ink">{v}</span></div>
}
