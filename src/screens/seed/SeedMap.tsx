import { useEffect, useState, Fragment, type ReactNode } from 'react'
import type { Map as LMap } from 'leaflet'
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { HYBRID_COLORS, fieldRing, type ClientField } from '../../seedData'
import { CLIENT_GEO } from '../../seedFieldsGeo'
import { ndviColor, statusColor } from '../../agronomData'
import { ZoomBar, OverlayCard, LayerBar, LayerToggle, NdviLegend, ringsBounds, type LatLng } from '../../components/MapKit'
import { X, UserPlus, AlertTriangle, ArrowLeft, MapPin } from 'lucide-react'

type SeedLayer = 'hybrid' | 'ndvi' | 'status'

const seedOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
// реальный контур поля клиента (OSM) или стилизованный fallback
const ringOf = (f: ClientField): LatLng[] => (CLIENT_GEO[f.id]?.ring as LatLng[]) || fieldRing(f.region, seedOf(f.id))
const centerOf = (f: ClientField): LatLng => {
  const g = CLIENT_GEO[f.id]
  if (g) return g.center as LatLng
  const r = ringOf(f); return [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2]
}
function ptsBounds(pts: LatLng[]): [LatLng, LatLng] {
  let m = 90, M = -90, n = 180, N = -180
  for (const [a, b] of pts) { m = Math.min(m, a); M = Math.max(M, a); n = Math.min(n, b); N = Math.max(N, b) }
  return [[m, n], [M, N]]
}

// Полёт камеры: фокус на поле клиента / обратно на национальный обзор
function SeedFly({ picked, centers }: { picked: ClientField | null; centers: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (picked) {
      const b = ringsBounds([ringOf(picked)])
      if (b) map.flyToBounds(b, { padding: [70, 70], maxZoom: 14, duration: 0.7 })
    } else if (centers.length) {
      map.flyToBounds(ptsBounds(centers), { padding: [60, 60], maxZoom: 8, duration: 0.6 })
    }
  }, [picked?.id]) // eslint-disable-line
  return null
}

export function SeedMap({ fields, picked, onPick, onAssign, onClose, height = 560 }: {
  fields: ClientField[]
  selected?: string
  picked?: ClientField | null
  onPick?: (id: string) => void
  onAssign?: (f: ClientField) => void
  onClose?: () => void
  height?: number
}) {
  const [map, setMap] = useState<LMap | null>(null)
  const [layer, setLayer] = useState<SeedLayer>('hybrid')
  const [pulseT, setPulseT] = useState(0)
  useEffect(() => { const id = setInterval(() => setPulseT(t => (t + 0.18) % (Math.PI * 2)), 35); return () => clearInterval(id) }, [])
  const pingPhase = pulseT / (Math.PI * 2)
  const pingRadius = 4 + pingPhase * 32
  const pingOpacity = Math.max(0, 1 - pingPhase)
  const hybrids = [...new Set(fields.map((f) => f.hybrid))]
  const centers = fields.map(centerOf)
  const focus = picked || null
  const fitAll = () => { if (map && centers.length) map.flyToBounds(ptsBounds(centers), { padding: [60, 60], maxZoom: 8 }) }
  const fillFor = (f: ClientField) => layer === 'hybrid' ? (HYBRID_COLORS[f.hybrid] || '#888') : layer === 'ndvi' ? ndviColor(f.ndvi) : statusColor(f.status)

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line" style={{ height }}>
      <MapContainer ref={setMap} center={[50, 41]} zoom={5} className="absolute inset-0 h-full w-full" zoomControl={false} attributionControl={false} scrollWheelZoom={false}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        <SeedFly picked={focus} centers={centers} />

        {/* G3: пульсирующие кольца «риск» под пинами — триаж «куда реагировать» */}
        {!focus && fields.filter((f) => f.status === 'risk').map((f) => (
          <Fragment key={f.id}>
            <CircleMarker key={`dot-${f.id}`} center={centerOf(f)} radius={4} interactive={false}
              pathOptions={{ color: '#e5302a', weight: 2, fillColor: '#e5302a', fillOpacity: 0.7, opacity: 0.95 }} />
            <CircleMarker key={`ping-${f.id}`} center={centerOf(f)} radius={pingRadius} interactive={false}
              pathOptions={{ color: '#e5302a', weight: 3, fill: false, opacity: pingOpacity }} />
          </Fragment>
        ))}

        {/* ОБЗОР: пины клиентов (кроме сфокусированного) */}
        {fields.map((f) => {
          if (focus && f.id === focus.id) return null
          return (
            <CircleMarker key={f.id} center={centerOf(f)} radius={focus ? 6 : 8}
              pathOptions={{ color: f.status === 'ok' ? '#ffffff' : statusColor(f.status), weight: f.status === 'ok' ? 2 : 3, fillColor: fillFor(f), fillOpacity: 0.95 }}
              eventHandlers={{ click: () => onPick?.(f.id) }}>
              <Tooltip direction="top" offset={[0, -4]}>{f.farm} · {f.hybrid}{f.alert ? ` · ${f.alert}` : ''}</Tooltip>
            </CircleMarker>
          )
        })}

        {/* ФОКУС: реальный контур выбранного поля */}
        {focus && (
          <Polygon positions={ringOf(focus)} eventHandlers={{ click: () => onPick?.(focus.id) }}
            pathOptions={{ color: '#fc3f1d', weight: 3, fillColor: fillFor(focus), fillOpacity: 0.5 }}>
            <Tooltip direction="top" offset={[0, -2]} permanent className="agro-tip">{focus.farm}</Tooltip>
          </Polygon>
        )}
      </MapContainer>

      {/* слева: легенда (обзор) или кнопка назад (фокус) */}
      {focus ? (
        <OverlayCard className="top-3 left-3">
          <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ink hover:text-brand"><ArrowLeft size={15} />Все поля клиентов</button>
        </OverlayCard>
      ) : (
        <OverlayCard className="top-3 left-3 p-3 w-56">
          <div className="text-[11px] font-bold text-ink mb-2 flex items-center gap-1.5"><MapPin size={12} className="text-brand" />Поля клиентов · по гибриду</div>
          {hybrids.map((h) => (
            <div key={h} className="flex items-center gap-1.5 text-xs py-0.5 text-ink">
              <i className="w-2.5 h-2.5 rounded-full" style={{ background: HYBRID_COLORS[h] || '#888' }} />{h}
            </div>
          ))}
          <div className="text-[10px] text-muted mt-2 pt-2 border-t border-line">Клик по клиенту → его поле на снимке</div>
        </OverlayCard>
      )}

      <ZoomBar map={map} onFit={fitAll} className="right-3 top-3" />

      {/* всплывающая карточка поля */}
      {focus && (
        <div className="absolute bottom-16 left-3 z-[600] bg-white rounded-2xl shadow-xl border border-line w-72 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
            <div className="font-bold text-ink text-sm">{focus.farm}</div>
            <button onClick={onClose} className="text-muted hover:text-ink"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-1.5 text-sm">
            <Row k="Гибрид" v={<span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: HYBRID_COLORS[focus.hybrid] || '#888' }} />{focus.hybrid}</span>} />
            <Row k="Зона" v={focus.zone} />
            <Row k="Регион" v={focus.region} />
            <Row k="Площадь" v={`${focus.areaHa} га`} />
            <Row k="NDVI" v={<b style={{ color: statusColor(focus.status) }}>{focus.ndvi.toFixed(2)}</b>} />
            {focus.alert && <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-risk bg-risk-soft px-2 py-1 rounded-lg"><AlertTriangle size={12} />{focus.alert}</div>}
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => onAssign?.(focus)} className="w-full flex items-center justify-center gap-1.5 bg-brand text-white rounded-xl py-2 text-sm font-semibold"><UserPlus size={14} />Назначить агронома</button>
          </div>
        </div>
      )}

      {/* нижний бар слоёв */}
      <LayerBar>
        <span className="text-xs text-muted shrink-0">🛰 Sentinel · {focus ? focus.region : 'клиентские поля Genesis'}</span>
        <LayerToggle options={[['hybrid', 'Гибрид'], ['ndvi', 'NDVI'], ['status', 'Статус']] as const} value={layer} onChange={setLayer} />
        <div className="flex-1" />
        {layer === 'ndvi' && <NdviLegend />}
        {layer === 'status' && (
          <div className="flex items-center gap-2.5 shrink-0 text-[10px] text-muted">
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: statusColor('ok') }} />Норма</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: statusColor('warn') }} />Внимание</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: statusColor('risk') }} />Риск</span>
          </div>
        )}
      </LayerBar>
    </div>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted text-xs">{k}</span><span className="font-semibold text-ink">{v}</span></div>
}
