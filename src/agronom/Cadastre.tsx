import { useState } from 'react'
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AG_FIELDS, AG_CENTER, AG_BOUNDS, CROP_COLORS } from '../agronomData'
import { PARCELS, type Parcel } from '../agronomData2'
import { FitBounds } from '../components/MapKit'
import { Landmark } from 'lucide-react'

export function Cadastre() {
  const [showFields, setShowFields] = useState(true)
  const [sel, setSel] = useState<Parcel | null>(null)
  const totalKn = PARCELS.length
  const matched = PARCELS.filter((p) => p.matchedField).length

  return (
    <div className="flex h-full min-h-0">
      <div className="relative flex-1 min-w-0">
        <MapContainer center={AG_CENTER} zoom={13} className="absolute inset-0 h-full w-full" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <FitBounds bounds={AG_BOUNDS} padding={50} />
          {showFields && AG_FIELDS.map((f) => (
            <Polygon key={f.id} positions={f.ring} pathOptions={{ color: '#ffffff', weight: 1, fillColor: CROP_COLORS[f.crop], fillOpacity: 0.35 }} />
          ))}
          {PARCELS.map((p) => (
            <Polygon key={p.kn} positions={p.ring} eventHandlers={{ click: () => setSel(p) }}
              pathOptions={{ color: p.kn === sel?.kn ? '#fc3f1d' : '#ff3b30', weight: p.kn === sel?.kn ? 3 : 1.4, fillColor: '#ff3b30', fillOpacity: p.kn === sel?.kn ? 0.28 : 0.06, dashArray: '4 3' }}>
              <Tooltip direction="center" className="agro-tip">{p.kn.split(':').slice(-1)[0]}</Tooltip>
            </Polygon>
          ))}
        </MapContainer>
        <div className="absolute top-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-bold text-ink"><Landmark size={16} className="text-brand" />Кадастр · Росреестр</div>
          <label className="flex items-center gap-2 text-xs text-muted mt-2"><input type="checkbox" checked={showFields} onChange={(e) => setShowFields(e.target.checked)} />Показывать поля</label>
          <div className="flex items-center gap-2 text-xs text-muted mt-1"><span className="w-3 h-2 border-2 border-dashed border-[#ff3b30]" />кадастровые участки</div>
        </div>
      </div>

      <aside className="w-80 shrink-0 border-l border-line bg-white flex flex-col">
        <div className="p-4 border-b border-line">
          <div className="font-bold text-ink">Земельный банк</div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-canvas rounded-xl p-3"><div className="text-xl font-extrabold text-ink">{totalKn}</div><div className="text-[11px] text-muted">КН-участков</div></div>
            <div className="bg-canvas rounded-xl p-3"><div className="text-xl font-extrabold text-brand">{matched}</div><div className="text-[11px] text-muted">сопоставлено с полями</div></div>
          </div>
          <p className="text-xs text-muted mt-3">При подключении карта полей автоматически соотносится с данными Росреестра.</p>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {PARCELS.map((p) => (
            <button key={p.kn} onClick={() => setSel(p)} className={`w-full px-4 py-2.5 border-b border-line text-left hover:bg-canvas ${p.kn === sel?.kn ? 'bg-brand-soft/40' : ''}`}>
              <div className="font-semibold text-ink text-sm">{p.kn}</div>
              <div className="text-xs text-muted">{p.areaHa} га · {p.matchedField ? `поле ${p.matchedField}` : 'нет пересечения с полями'}</div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}
