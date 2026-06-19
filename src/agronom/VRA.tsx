import { useMemo, useState } from 'react'
import type { Map as LMap } from 'leaflet'
import { MapContainer, TileLayer, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AG_FIELDS, AG_CENTER, fieldZones, zoneAreas, type AgField, type ZoneLevel } from '../agronomData'
import { ZoomBar, FitBounds, ringsBounds } from '../components/MapKit'
import { rub } from '../seedDossierData'
import { Map as MapIcon, Download, Layers, TrendingDown, TrendingUp } from 'lucide-react'

// дифференцированная норма по зонам: меньше на сильных, больше на слабых
const COEF: Record<ZoneLevel, number> = { low: 1.2, mid: 1.0, high: 0.65 }
const LEVEL_COLOR: Record<ZoneLevel, string> = { low: '#d23c28', mid: '#f0d228', high: '#3c9e46' }
const LEVEL_LABEL: Record<ZoneLevel, string> = { low: 'низкая', mid: 'средняя', high: 'высокая' }

const PRODUCTS = [
  { id: 'prozaro', name: 'Прозаро · фунгицид', norm: 0.8, unit: 'л/га', price: 3450 },
  { id: 'karbamid', name: 'Карбамид · азот', norm: 0.15, unit: 'т/га', price: 34000 },
  { id: 'glifosat', name: 'Глифосат · гербицид', norm: 3.0, unit: 'л/га', price: 480 },
]
const FIELDS = AG_FIELDS.filter((f) => f.crop !== 'Пар')

type Prod = typeof PRODUCTS[number]

function calc(field: AgField, prod: Prod) {
  const zones = fieldZones(field.ring, field.ndvi, field.ndviCV)
  const za = zoneAreas(zones, field.areaHa)
  const levels = (['high', 'mid', 'low'] as const).map((lvl) => {
    const ha = za[lvl].ha
    const norm = +(prod.norm * COEF[lvl]).toFixed(3)
    const qty = norm * ha
    return { lvl, ha, pct: za[lvl].pct, norm, qty, cost: qty * prod.price }
  })
  const uniformQty = prod.norm * field.areaHa
  const uniformCost = uniformQty * prod.price
  const vraQty = levels.reduce((s, l) => s + l.qty, 0)
  const vraCost = levels.reduce((s, l) => s + l.cost, 0)
  const saveRub = uniformCost - vraCost
  return { zones, levels, uniformQty, uniformCost, vraQty, vraCost, saveRub, savePerHa: saveRub / field.areaHa, savePct: uniformCost ? Math.round((saveRub / uniformCost) * 100) : 0 }
}

export function VRA() {
  const [prodId, setProdId] = useState('prozaro')
  const prod = PRODUCTS.find((p) => p.id === prodId)!
  // по умолчанию — поле с наибольшей экономией под выбранный продукт (выигрышный кейс)
  const bestId = useMemo(() => [...FIELDS].sort((a, b) => calc(b, prod).saveRub - calc(a, prod).saveRub)[0].id, [prodId])
  const [fieldId, setFieldId] = useState(bestId)
  const field = FIELDS.find((f) => f.id === fieldId) ?? FIELDS.find((f) => f.id === bestId)!
  const [map, setMap] = useState<LMap | null>(null)
  const r = useMemo(() => calc(field, prod), [field, prod])
  const bounds = ringsBounds([field.ring])

  const exportMap = () => {
    const payload = {
      field: field.name, crop: field.crop, areaHa: field.areaHa, product: prod.name,
      baseNorm: `${prod.norm} ${prod.unit}`,
      zones: r.levels.map((l) => ({ zone: LEVEL_LABEL[l.lvl], ha: l.ha, norm: `${l.norm} ${prod.unit}` })),
      economy: { uniformCost: Math.round(r.uniformCost), vraCost: Math.round(r.vraCost), saveRub: Math.round(r.saveRub) },
      note: 'Модельный расчёт прототипа Агро. Зоны — спутниковый NDVI-слой.',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `karta-zadanie_${field.name}_${prod.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const saved = r.saveRub >= 0
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Layers size={20} className="text-brand" />Карта-задание · дифференцированное внесение</h2>
          <p className="text-sm text-muted">Норма по зонам NDVI вместо равномерной: меньше на сильных участках, больше на слабых. Зоны — спутниковый слой.</p>
        </div>
        <button onClick={exportMap} className="flex items-center gap-1.5 bg-ink text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90"><Download size={15} />Экспорт карты-задания</button>
      </div>

      {/* выбор поля и продукта */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={fieldId} onChange={(e) => setFieldId(e.target.value)} className="px-3 py-2 rounded-xl bg-white border border-line text-sm font-semibold">
          {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.name} · {f.crop} · {f.areaHa} га</option>)}
        </select>
        <div className="inline-flex rounded-xl bg-canvas p-1">
          {PRODUCTS.map((p) => (
            <button key={p.id} onClick={() => setProdId(p.id)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${prodId === p.id ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>{p.name}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* карта зон */}
        <div className="col-span-3 relative h-[440px] rounded-2xl overflow-hidden border border-line">
          <MapContainer ref={setMap} center={AG_CENTER} zoom={14} className="absolute inset-0 h-full w-full" zoomControl={false} attributionControl={false}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            {r.zones.map((z, i) => (
              <Polygon key={i} positions={z.ring} pathOptions={{ stroke: false, fillColor: LEVEL_COLOR[z.level], fillOpacity: 0.82 }} />
            ))}
            <Polygon positions={field.ring} pathOptions={{ color: '#fff', weight: 2.5, fill: false }} />
            {bounds && <FitBounds bounds={bounds} padding={40} />}
          </MapContainer>
          <ZoomBar map={map} onFit={() => { if (map && bounds) map.fitBounds(bounds, { padding: [40, 40] }) }} className="right-3 bottom-3" />
          <div className="absolute top-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg text-[11px] flex items-center gap-3">
            {(['low', 'mid', 'high'] as const).map((lvl) => (
              <span key={lvl} className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm" style={{ background: LEVEL_COLOR[lvl] }} />{LEVEL_LABEL[lvl]} ×{COEF[lvl]}</span>
            ))}
          </div>
          <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl px-3 py-1.5 shadow-lg text-xs font-semibold text-ink flex items-center gap-1.5"><MapIcon size={13} className="text-brand" />{field.name} · {field.crop} · {field.areaHa} га</div>
        </div>

        {/* нормы по зонам + экономия */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <div className="px-4 py-3 font-bold text-ink border-b border-line">Норма по зонам · {prod.name}</div>
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line">
                <th className="text-left font-medium p-3">Зона</th>
                <th className="text-right font-medium p-3">Площадь</th>
                <th className="text-right font-medium p-3">Норма</th>
                <th className="text-right font-medium p-3">Объём</th>
              </tr></thead>
              <tbody>
                {r.levels.map((l) => (
                  <tr key={l.lvl} className="border-b border-line last:border-0">
                    <td className="p-3"><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: LEVEL_COLOR[l.lvl] }} />{LEVEL_LABEL[l.lvl]}</span></td>
                    <td className="p-3 text-right">{l.ha} га<div className="text-[10px] text-muted">{l.pct}%</div></td>
                    <td className="p-3 text-right font-semibold">{l.norm} {prod.unit}</td>
                    <td className="p-3 text-right text-muted">{+l.qty.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-canvas/50 font-semibold">
                  <td className="p-3 text-ink">Равномерно</td>
                  <td className="p-3 text-right">{field.areaHa} га</td>
                  <td className="p-3 text-right">{prod.norm} {prod.unit}</td>
                  <td className="p-3 text-right text-muted">{+r.uniformQty.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`rounded-2xl border p-4 ${saved ? 'border-ok/30 bg-ok-soft/40' : 'border-warn/30 bg-warn-soft/40'}`}>
            <div className="flex items-center gap-2 font-bold text-ink mb-1">
              {saved ? <TrendingDown size={16} className="text-ok" /> : <TrendingUp size={16} className="text-warn" />}
              {saved ? 'Экономия vs равномерная норма' : 'Доп. вложение в слабые зоны'}
            </div>
            <div className="text-2xl font-extrabold leading-none" style={{ color: saved ? '#2da84f' : '#e0900a' }}>{rub(Math.abs(r.saveRub))}<span className="text-sm font-semibold text-muted"> · {Math.abs(r.savePct)}%</span></div>
            <div className="text-xs text-muted mt-1">{rub(Math.abs(r.savePerHa))}/га на {field.areaHa} га · {prod.name.split(' ·')[0]}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <div className="rounded-lg bg-white/70 p-2"><div className="text-[11px] text-muted">Равномерно</div><div className="font-bold text-ink">{rub(r.uniformCost)}</div></div>
              <div className="rounded-lg bg-white/70 p-2"><div className="text-[11px] text-muted">Дифференцированно</div><div className="font-bold text-ink">{rub(r.vraCost)}</div></div>
            </div>
            <div className="text-[10px] text-muted mt-2">Плановая (модельная) оценка: зоны по NDVI-слою, норма × коэффициент зоны. Факт — после внесения и контроля по телеметрии.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
