import { useState, useMemo, type ReactNode } from 'react'
import type { Map as LMap } from 'leaflet'
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { GPS_TRACKS } from '../agronomData2'
import { AG_FIELDS, AG_CENTER, AG_BOUNDS, CROP_COLORS, CROP_SUMMARY, ndviColor, statusColor, fieldZones, zoneAreas, FARM, type AgField, type Crop } from '../agronomData'
import { Search, Plus, SlidersHorizontal, Eye, CalendarRange, X, AlertTriangle, BarChart3 } from 'lucide-react'
import { Chronology } from './Chronology'
import { useAgro } from '../agroStore'
import { useApp } from '../store'
import { ZoomBar, FitBounds, ringsBounds } from '../components/MapKit'
import { Sparkline, ndviSeries } from '../components/FieldGlance'
import { fieldMoisture, moistureColor } from '../agronomWeather'

type Layer = 'snapshot' | 'ndvi' | 'contrast' | 'crop' | 'moisture'

function bbox(ring: [number, number][]) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const [la, ln] of ring) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln) }
  return { minLat, maxLat, minLng, maxLng }
}
function thumbPath(ring: [number, number][]) {
  const b = bbox(ring); const w = 40, h = 28, pad = 3
  const sx = (w - 2 * pad) / Math.max(1e-6, b.maxLng - b.minLng)
  const sy = (h - 2 * pad) / Math.max(1e-6, b.maxLat - b.minLat)
  return ring.map(([la, ln]) => `${pad + (ln - b.minLng) * sx},${pad + (b.maxLat - la) * sy}`).join(' ')
}

function FlyTo({ field }: { field: AgField | null }) {
  const map = useMap()
  if (field) {
    const b = bbox(field.ring)
    map.flyToBounds([[b.minLat, b.minLng], [b.maxLat, b.maxLng]], { padding: [80, 80], duration: 0.6 })
  }
  return null
}

export function MapWorkspace() {
  const { issueForField } = useAgro()
  const { go, role } = useApp()
  const isOwner = role === 'owner'
  const [layer, setLayer] = useState<Layer>('contrast')
  const [selId, setSelId] = useState<string | null>(null)
  const [cropFilter, setCropFilter] = useState<Crop | 'all'>('all')
  const [search, setSearch] = useState('')
  const [mapTab, setMapTab] = useState<'fields' | 'sat' | 'gps'>('sat')
  const [flyTarget, setFlyTarget] = useState<AgField | null>(null)
  const [chrono, setChrono] = useState<AgField | null>(null)
  const [zonesOn, setZonesOn] = useState(true)
  const [map, setMap] = useState<LMap | null>(null)
  const fitAll = () => { const b = ringsBounds(list.map((f) => f.ring)); if (map && b) map.fitBounds(b, { padding: [60, 60] }) }

  const sel = AG_FIELDS.find((f) => f.id === selId) || null
  const zones = useMemo(() => (sel ? fieldZones(sel.ring, sel.ndvi, sel.ndviCV) : []), [sel])
  const showZones = !!sel && zonesOn && (layer === 'ndvi' || layer === 'contrast')
  const list = useMemo(() => AG_FIELDS.filter((f) =>
    (cropFilter === 'all' || f.crop === cropFilter) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.crop.toLowerCase().includes(search.toLowerCase()))
  ), [cropFilter, search])

  const fillFor = (f: AgField) => {
    if (layer === 'crop') return CROP_COLORS[f.crop]
    if (layer === 'moisture') return moistureColor(fieldMoisture(f.ndvi, f.status))
    if (layer === 'ndvi' || layer === 'contrast') return ndviColor(f.ndvi)
    return '#ffffff'
  }
  const fillOp = (f: AgField) => {
    if (layer === 'snapshot') return f.id === selId ? 0.15 : 0.04
    if (showZones && f.id === selId) return 0.05 // зоны рисуются поверх — освобождаем заливку
    return f.id === selId ? 0.92 : 0.72
  }

  const cropAvg = useMemo(() => {
    const m = new Map<Crop, { sum: number; n: number }>()
    for (const f of AG_FIELDS) { const e = m.get(f.crop) || { sum: 0, n: 0 }; e.sum += f.ndvi; e.n++; m.set(f.crop, e) }
    return [...m.entries()].map(([crop, e]) => ({ crop, ndvi: e.sum / e.n }))
  }, [])

  const pick = (f: AgField) => { setSelId(f.id); setFlyTarget(f); setTimeout(() => setFlyTarget(null), 700) }

  return (
    <div className="flex h-full min-h-0">
      {/* MAP */}
      <div className="relative flex-1 min-w-0">
        <MapContainer ref={setMap} center={AG_CENTER} zoom={13} className="absolute inset-0 h-full w-full" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          {list.map((f) => (
            <Polygon key={f.id} positions={f.ring} eventHandlers={{ click: () => pick(f) }}
              pathOptions={{ color: f.id === selId ? '#fc3f1d' : '#ffffff', weight: f.id === selId ? 3 : 1.2, fillColor: fillFor(f), fillOpacity: fillOp(f) }}>
              <Tooltip direction="center" permanent className="agro-tip">{f.name}</Tooltip>
            </Polygon>
          ))}
          {/* G3: пульсирующие кольца «риск» — глаз сразу ведёт к проблемным полям */}
          {list.filter((f) => f.status === 'risk').map((f) => {
            const c: [number, number] = [f.ring.reduce((a, p) => a + p[0], 0) / f.ring.length, f.ring.reduce((a, p) => a + p[1], 0) / f.ring.length]
            return <CircleMarker key={`pulse-${f.id}`} center={c} radius={11} interactive={false} pathOptions={{ className: 'risk-pulse', color: '#e5302a', weight: 2, fill: false }} />
          })}
          {/* внутриполевые NDVI-зоны выбранного поля (точное земледелие) */}
          {showZones && zones.map((z, i) => (
            <Polygon key={'z' + i} positions={z.ring} pathOptions={{ stroke: false, fillColor: ndviColor(z.ndvi), fillOpacity: 0.9 }} />
          ))}
          {showZones && sel && <Polygon positions={sel.ring} pathOptions={{ color: '#fc3f1d', weight: 3, fill: false }} />}
          {mapTab === 'gps' && GPS_TRACKS.map((t) => (
            <Polyline key={t.machine} positions={t.points} pathOptions={{ color: t.color, weight: 3, opacity: 0.9 }}>
              <Tooltip>{t.machine} · {t.speed} км/ч</Tooltip>
            </Polyline>
          ))}
          {mapTab === 'gps' && GPS_TRACKS.map((t) => (
            <CircleMarker key={t.machine + '_m'} center={t.points[t.points.length - 1]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: t.color, fillOpacity: 1 }} />
          ))}
          <FitBounds bounds={AG_BOUNDS} padding={50} />
          <FlyTo field={flyTarget} />
        </MapContainer>

        {/* zoom controls */}
        <ZoomBar map={map} onFit={fitAll} className="right-3 bottom-20" />

        {/* top tabs */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] flex gap-1 bg-black/55 backdrop-blur rounded-xl p-1">
          {([['fields', 'Поля'], ['sat', 'Спутниковые снимки'], ['gps', 'GPS мониторинг']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMapTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mapTab === k ? 'bg-white text-ink' : 'text-white/80 hover:text-white'}`}>{l}</button>
          ))}
        </div>

        {/* crop filter overlay */}
        {mapTab !== 'gps' && (
        <div className="absolute top-16 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg w-56">
          <div className="text-[11px] font-bold text-ink mb-2">Фильтрация по культуре</div>
          <button onClick={() => setCropFilter('all')} className={`w-full flex items-center justify-between text-xs py-1 ${cropFilter === 'all' ? 'font-bold text-brand' : 'text-muted'}`}>
            <span>Все культуры</span></button>
          {cropAvg.map(({ crop, ndvi }) => (
            <button key={crop} onClick={() => setCropFilter(cropFilter === crop ? 'all' : crop)} className={`w-full flex items-center justify-between text-xs py-1 ${cropFilter === crop ? 'font-bold' : ''}`}>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[crop] }} />{crop}</span>
              <span className="text-muted">🌿 {ndvi.toFixed(2)}</span>
            </button>
          ))}
        </div>
        )}

        {/* GPS panel */}
        {mapTab === 'gps' && (
          <div className="absolute top-16 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg w-64">
            <div className="text-[11px] font-bold text-ink mb-2">GPS-мониторинг · техника в поле</div>
            {GPS_TRACKS.map((t) => (
              <div key={t.machine} className="flex items-center gap-2 py-1.5 border-t border-line first:border-0">
                <i className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                <div className="flex-1"><div className="text-xs font-semibold text-ink">{t.machine}</div><div className="text-[10px] text-muted">{t.operator}</div></div>
                <div className="text-right"><div className="text-xs font-bold text-ink">{t.speed} км/ч</div><div className="text-[10px] text-muted">{t.ha} га</div></div>
              </div>
            ))}
          </div>
        )}

        {/* selected field detail */}
        {sel && (
          <div className="absolute bottom-20 left-3 z-[500] bg-white rounded-2xl shadow-xl border border-line w-72 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
              <div className="font-bold text-ink">{sel.name} · {sel.areaHa} га</div>
              <button onClick={() => setSelId(null)} className="text-muted hover:text-ink"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-1.5 text-sm">
              <Row k="Культура" v={<span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[sel.crop] }} />{sel.crop}</span>} />
              <Row k="Сорт" v={sel.sort} />
              <Row k="Предшественник" v={sel.predecessor} />
              <Row k="NDVI" v={<b style={{ color: statusColor(sel.status) }}>{sel.ndvi.toFixed(2)}</b>} />
              {(() => { const iss = issueForField(sel.id); return iss && (iss.status === 'открыта' || iss.status === 'рецидив') })()
                ? <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-risk bg-risk-soft px-2 py-1 rounded-lg"><AlertTriangle size={12} />Требует решения: {issueForField(sel.id)?.problem.name}</div>
                : sel.alert && <div className="text-xs text-risk pt-1">{sel.alert}</div>}
              {showZones && (() => { const za = zoneAreas(zones, sel.areaHa); return (
                <div className="mt-2 pt-2 border-t border-line">
                  <div className="text-[11px] font-semibold text-muted mb-1.5">Внутриполевые NDVI-зоны · {zones.length} ячеек</div>
                  <div className="space-y-1">
                    {([['high', 'высокая', '#3c9e46'], ['mid', 'средняя', '#f0d228'], ['low', 'низкая', '#d23c28']] as const).map(([lvl, label, col]) => (
                      <div key={lvl} className="flex items-center gap-2 text-xs">
                        <i className="w-3 h-3 rounded-sm shrink-0" style={{ background: col }} />
                        <span className="flex-1 text-ink">{label} зона</span>
                        <span className="text-muted">{za[lvl].ha} га · {za[lvl].pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted mt-1.5">Основа карты-задания дифвнесения: норму выше в низких зонах, ниже в высоких.</div>
                </div>
              ) })()}
            </div>
            <div className="flex gap-2 px-4 pb-4">
              {isOwner
                ? <button onClick={() => go('agAnalytics')} className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white rounded-xl py-2 text-sm font-semibold"><BarChart3 size={14} />Аналитика</button>
                : <button onClick={() => go('agScouting')} className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white rounded-xl py-2 text-sm font-semibold"><Eye size={14} />Осмотреть</button>}
              <button onClick={() => setChrono(sel)} className="flex items-center justify-center gap-1.5 bg-canvas text-ink rounded-xl py-2 px-3 text-sm font-semibold"><CalendarRange size={14} />Сезон поля</button>
            </div>
          </div>
        )}

        {/* bottom layer bar */}
        <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl px-4 py-2 shadow-lg">
          <span className="text-xs text-muted shrink-0">🛰 7 июля 2026 · Sentinel</span>
          <div className="flex gap-2 shrink-0">
            {([['snapshot', 'Снимок'], ['ndvi', 'NDVI'], ['contrast', 'Контрастный NDVI'], ['crop', 'Культуры'], ['moisture', 'Влага']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setLayer(k)} className={`text-xs font-semibold ${layer === k ? 'text-brand' : 'text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
          {(layer === 'ndvi' || layer === 'contrast') && sel && (
            <button onClick={() => setZonesOn((v) => !v)} title="Внутриполевые NDVI-зоны выбранного поля" className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${zonesOn ? 'bg-brand text-white' : 'bg-canvas text-muted hover:text-ink'}`}>{zonesOn ? 'Зоны поля' : 'Среднее'}</button>
          )}
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted">
            {CROP_SUMMARY.slice(0, 5).map((c) => (
              <span key={c.crop} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: CROP_COLORS[c.crop] }} />{c.ha}</span>
            ))}
          </div>
          {(layer === 'ndvi' || layer === 'contrast') && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted">ниже</span>
              <span className="h-2 w-24 rounded" style={{ background: 'linear-gradient(90deg,#d23c28,#f0d228,#3c9e46)' }} />
              <span className="text-[10px] text-muted">выше</span>
            </div>
          )}
          {layer === 'moisture' && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted">сухо</span>
              <span className="h-2 w-24 rounded" style={{ background: 'linear-gradient(90deg,rgb(176,106,46),rgb(216,194,122),rgb(59,143,181))' }} />
              <span className="text-[10px] text-muted">влажно</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT field list */}
      <aside className="w-80 shrink-0 border-l border-line bg-white flex flex-col">
        <div className="p-3 border-b border-line">
          <div className="flex items-center gap-2 px-3 py-2 bg-canvas rounded-xl">
            <Search size={15} className="text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по полю / координатам…" className="flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="flex gap-2 mt-2">
            {!isOwner && <button className="flex-1 flex items-center justify-center gap-1.5 bg-canvas hover:bg-brand-soft text-ink rounded-xl py-2 text-sm font-semibold"><Plus size={15} />Добавить поле</button>}
            <button className={`${isOwner ? 'flex-1 justify-center' : ''} flex items-center gap-1.5 bg-canvas text-ink rounded-xl py-2 px-3 text-sm font-semibold`}><SlidersHorizontal size={15} />Фильтры</button>
          </div>
          <div className="text-xs text-muted mt-2 px-1">{isOwner ? 'Портфель' : ''} {list.length} полей · {FARM.totalHa.toLocaleString('ru-RU')} га</div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {list.map((f) => (
            <button key={f.id} onClick={() => pick(f)} className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-line text-left hover:bg-canvas ${f.id === selId ? 'bg-brand-soft/40' : ''}`}>
              <svg viewBox="0 0 40 28" className="w-10 h-7 shrink-0"><polygon points={thumbPath(f.ring)} fill={CROP_COLORS[f.crop]} fillOpacity={0.85} stroke="#fff" strokeWidth={1} /></svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold text-ink text-sm">{f.name}</span><i className="w-2 h-2 rounded-full" style={{ background: statusColor(f.status) }} /></div>
                <div className="text-xs text-muted truncate">{f.crop}, {f.areaHa}га · NDVI {f.ndvi.toFixed(2)}</div>
              </div>
              <Sparkline values={ndviSeries(f.id, f.ndvi, f.status)} w={48} h={20} />
            </button>
          ))}
        </div>
      </aside>
      {chrono && <Chronology field={chrono} onClose={() => setChrono(null)} />}
    </div>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted text-xs">{k}</span><span className="font-semibold text-ink">{v}</span></div>
}
