import { useEffect, useMemo, useState } from 'react'
import type { Map as LMap } from 'leaflet'
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AG_FIELDS, AG_CENTER, fieldZones, type LatLng } from '../agronomData'
import { rub } from '../seedDossierData'

// позиция вдоль ломаной по доле пути 0..1 (линейная интерполяция между точками)
function pointAlong(pts: LatLng[], frac: number): LatLng {
  if (pts.length < 2) return pts[0]
  const f = Math.max(0, Math.min(1, frac)) * (pts.length - 1)
  const i = Math.floor(f), r = f - i
  const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)]
  return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]
}
import { MACHINES, ALERTS, QUALITY, FLEET_KPI, ANTIFRAUD, PAY_RATE, FUEL_PRICE, type Machine, type MachineStatus, type AlertKind } from '../telematicsData'
import { ZoomBar, ringsBounds } from '../components/MapKit'
import { Modal } from '../components/Modal'
import { useApp } from '../store'

// точки трека → координаты для SVG-превью (viewBox 0..100)
function trackThumb(pts: LatLng[]): string {
  if (!pts.length) return ''
  let minLa = 90, maxLa = -90, minLn = 180, maxLn = -180
  for (const [la, ln] of pts) { minLa = Math.min(minLa, la); maxLa = Math.max(maxLa, la); minLn = Math.min(minLn, ln); maxLn = Math.max(maxLn, ln) }
  const w = maxLn - minLn || 1e-6, h = maxLa - minLa || 1e-6
  return pts.map(([la, ln]) => `${(((ln - minLn) / w) * 96 + 2).toFixed(1)},${(((maxLa - la) / h) * 96 + 2).toFixed(1)}`).join(' ')
}
function addHours(hhmm: string, h: number): string {
  const [hh, mm] = hhmm.split(':').map(Number)
  if (isNaN(hh)) return '—'
  const t = hh * 60 + (mm || 0) + Math.round(h * 60)
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
import {
  Radar, Sparkles, Gauge, Fuel, AlertTriangle, Bot, Wrench, ShieldAlert, Wind,
  Satellite, ArrowRight, CircleDot, Activity,
} from 'lucide-react'

const STATUS_TONE: Record<MachineStatus, string> = {
  'в работе': 'bg-ok-soft text-ok', 'простой': 'bg-warn-soft text-warn', 'на стоянке': 'bg-canvas text-muted',
}
const ALERT_ICON: Record<AlertKind, typeof Gauge> = {
  'перекрытие': CircleDot, 'скорость': Gauge, 'простой': Activity, 'геозона': ShieldAlert, 'ГСМ': Fuel,
}

export function Telematics() {
  const { go, askCopilot } = useApp()
  const [map, setMap] = useState<LMap | null>(null)
  const [mode, setMode] = useState<'tracks' | 'quality' | 'plan' | 'work'>('tracks')
  const [drill, setDrill] = useState<Machine | null>(null) // drill-in антифрод-сводка по машине
  const live = MACHINES.filter((m) => m.points.length > 0)
  const fleetBounds = ringsBounds(live.map((m) => m.points))
  const fitAll = () => { if (map && fleetBounds) map.fitBounds(fleetBounds, { padding: [60, 60] }) }

  // ── План/факт внесения: карта-задание (зоны) × GPS-трек машины опрыскивания ──
  const sprayM = MACHINES.find((m) => m.op.includes('Опрыскивание') && m.points.length > 0) ?? live[0]
  const sprayField = AG_FIELDS.find((f) => f.id === sprayM.fieldId) ?? AG_FIELDS[0]
  const NORM = 0.8, PRICE = 3450 // Прозаро, л/га · ₽/л
  const planFact = useMemo(() => {
    // более плотная сетка, чем число проходов серпантина → видны реальные огрехи между проходами
    const zones = fieldZones(sprayField.ring, sprayField.ndvi, sprayField.ndviCV, 10, 10)
    let minLn = 180, maxLn = -180
    for (const [, ln] of sprayField.ring) { minLn = Math.min(minLn, ln); maxLn = Math.max(maxLn, ln) }
    const band = (maxLn - minLn) * 0.16
    // серпантин хранит только концы проходов → уплотняем линию, чтобы покрытие считалось по пути
    const dense: LatLng[] = []
    const pts = sprayM.points
    for (let i = 0; i < pts.length - 1; i++) {
      const [la1, ln1] = pts[i], [la2, ln2] = pts[i + 1]
      for (let s = 0; s <= 10; s++) { const t = s / 10; dense.push([la1 + (la2 - la1) * t, ln1 + (ln2 - ln1) * t]) }
    }
    const cells = zones.map((z) => {
      const las = z.ring.map((p) => p[0]), lns = z.ring.map((p) => p[1])
      const minLa = Math.min(...las), maxLa = Math.max(...las), mnLn = Math.min(...lns), mxLn = Math.max(...lns)
      const covered = dense.some(([la, ln]) => la >= minLa && la <= maxLa && ln >= mnLn && ln <= mxLn)
      const clng = (mnLn + mxLn) / 2
      const edge = clng < minLn + band || clng > maxLn - band
      const status: 'ok' | 'miss' | 'overlap' = !covered ? 'miss' : edge ? 'overlap' : 'ok'
      return { ring: z.ring, status }
    })
    const total = cells.length || 1
    const haPer = sprayField.areaHa / total
    const miss = cells.filter((c) => c.status === 'miss').length
    const overlap = cells.filter((c) => c.status === 'overlap').length
    const ok = total - miss - overlap
    const coveredHa = +(((ok + overlap) * haPer)).toFixed(1)
    const missHa = +((miss * haPer)).toFixed(1)
    const overlapHa = +((overlap * haPer)).toFixed(1)
    return {
      cells, coveragePct: Math.round(((ok + overlap) / total) * 100), coveredHa, missHa, overlapHa,
      overspendRub: Math.round(overlapHa * NORM * PRICE),     // двойной проход = перерасход СЗР
      undertreatRub: Math.round(missHa * NORM * PRICE),       // огрех = недовнесено (риск недобора)
    }
  }, [sprayM, sprayField])

  // перецентровка карты при смене режима: парк ↔ поле опрыскивания
  useEffect(() => {
    if (!map) return
    const b = mode === 'plan' ? ringsBounds([sprayField.ring]) : fleetBounds
    if (b) map.fitBounds(b, { padding: [50, 50] })
  }, [mode, map]) // eslint-disable-line

  // анимация: машины «в работе» едут по серпантину (real-time)
  const [animT, setAnimT] = useState(0)
  useEffect(() => { const id = setInterval(() => setAnimT((t) => (t + 0.008) % 1), 60); return () => clearInterval(id) }, [])
  const moving = (s: MachineStatus) => s === 'в работе'
  const headOf = (m: typeof MACHINES[number], i: number): LatLng =>
    moving(m.status) && m.points.length > 1 ? pointAlong(m.points, (animT + i * 0.41) % 1) : m.points[m.points.length - 1]

  // мигание для режима «качество внесения» (краевые огрехи)
  const blink = 0.5 + 0.5 * Math.sin(animT * Math.PI * 12) // 0..1, период ~1.2 с
  const badTracks = live.filter((m) => m.overlapPct >= 8)
  // краевые точки серпантина = точки разворота (где перекрытие/огрехи)
  const edgePoints = (pts: LatLng[]) => pts.filter((_, i) => i % 2 === 0)

  // в режиме «качество» подсвечиваем проблемный трек (перекрытие/скорость), остальные приглушаем
  const trackStyle = (color: string, overlap: number) => {
    if (mode === 'tracks' || mode === 'work') return { color, weight: 3, opacity: 0.9 }
    const bad = overlap >= 8
    return { color: bad ? '#e5302a' : '#2da84f', weight: bad ? 4 : 2.5, opacity: bad ? 0.35 + 0.65 * blink : 0.55 }
  }

  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2"><Radar size={20} className="text-brand" />Телематика · диспетчерская</h2>
          <p className="text-sm text-muted">Парк техники в реальном времени: треки, качество внесения, ГСМ и алерты. Данные с ГЛОНАСС/GPS и датчиков, разбор — ИИ платформы.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok bg-ok-soft px-3 py-1.5 rounded-full"><span className="w-2 h-2 rounded-full bg-ok animate-pulse" />online · {live.length} в эфире</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Kpi icon={<Satellite size={16} />} v={String(FLEET_KPI.inField)} l="техники в работе" />
        <Kpi icon={<Gauge size={16} />} v={`${FLEET_KPI.haToday} га`} l="обработано сегодня" />
        <Kpi icon={<Fuel size={16} />} v={`${FLEET_KPI.avgFuel} л/га`} l="средний расход ГСМ" />
        <Kpi icon={<AlertTriangle size={16} />} v={String(FLEET_KPI.alerts)} l="алертов требуют внимания" accent />
      </div>

      {/* ИИ-контроль качества: GPS × NDVI × Погода */}
      <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-soft/60 to-white p-4 mb-4">
        <div className="flex items-center gap-2 font-bold text-ink mb-2"><Sparkles size={16} className="text-brand" />ИИ-контроль качества · сшивка GPS × NDVI × Погода</div>
        <p className="text-sm text-ink leading-snug">{QUALITY.text}</p>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <Chip icon={<Activity size={12} />} label={`NDVI ${QUALITY.ndvi.toFixed(2)}`} />
          <Chip icon={<Wind size={12} />} label={`ветер ${QUALITY.windMs} м/с`} />
          <Chip icon={<Gauge size={12} />} label={`+${QUALITY.tempC} °C`} />
          <div className="flex-1" />
          <button onClick={() => askCopilot(`Разбери инцидент контроля качества опрыскивания. ${QUALITY.text} Дай вердикт и 2–3 конкретных шага.`)} className="text-xs font-bold text-brand inline-flex items-center gap-1"><Sparkles size={13} />Разобрать с ассистентом</button>
          <button onClick={() => go('agVegetation')} className="text-xs font-bold text-muted hover:text-ink inline-flex items-center gap-1">Проверить по NDVI<ArrowRight size={13} /></button>
        </div>
      </div>

      {/* Карта парка */}
      <div className="relative h-[420px] rounded-2xl overflow-hidden border border-line mb-4">
        <MapContainer ref={setMap} center={AG_CENTER} zoom={13} className="absolute inset-0 h-full w-full" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          {AG_FIELDS.map((f) => (
            <Polygon key={f.id} positions={f.ring} pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#ffffff', fillOpacity: 0.05 }} />
          ))}
          {mode !== 'plan' && live.map((m) => (
            <Polyline key={m.id} positions={m.points} pathOptions={trackStyle(m.color, m.overlapPct)}>
              <Tooltip>{m.name} · {m.op} · {m.speed} км/ч</Tooltip>
            </Polyline>
          ))}
          {mode !== 'plan' && live.map((m, i) => {
            const head = headOf(m, i)
            return (
              <CircleMarker key={m.id + '_halo'} center={head} radius={moving(m.status) ? 11 : 7} pathOptions={{ color: m.color, weight: 0, fillColor: m.color, fillOpacity: moving(m.status) ? 0.22 : 0 }} />
            )
          })}
          {mode !== 'plan' && live.map((m, i) => (
            <CircleMarker key={m.id + '_h'} center={headOf(m, i)} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: m.color, fillOpacity: 1 }}>
              <Tooltip permanent direction="top" className="agro-tip">{m.name.split(' ')[0]}</Tooltip>
            </CircleMarker>
          ))}
          {/* мигающие маркеры краевых огрехов в режиме «качество» */}
          {mode === 'quality' && badTracks.flatMap((m) => edgePoints(m.points).map((p, j) => (
            <CircleMarker key={m.id + '_e' + j} center={p} radius={5 + 7 * blink} pathOptions={{ color: '#e5302a', weight: 0, fillColor: '#e5302a', fillOpacity: 0.35 * (1 - blink) + 0.1 }} />
          )))}
          {/* План/факт внесения: зоны карты-задания (обработано/огрех/перекрытие) + трек */}
          {mode === 'plan' && planFact.cells.map((c, i) => (
            <Polygon key={'pf' + i} positions={c.ring} pathOptions={{ stroke: false, fillColor: c.status === 'miss' ? '#e5302a' : c.status === 'overlap' ? '#e0900a' : '#2da84f', fillOpacity: c.status === 'ok' ? 0.32 : c.status === 'miss' ? 0.7 : 0.6 }} />
          ))}
          {mode === 'plan' && <Polygon positions={sprayField.ring} pathOptions={{ color: '#fff', weight: 2.5, fill: false }} />}
          {mode === 'plan' && <Polyline positions={sprayM.points} pathOptions={{ color: '#0a0a0a', weight: 2, opacity: 0.8 }} />}
        </MapContainer>
        <ZoomBar map={map} onFit={fitAll} className="right-3 bottom-3" />
        {/* переключатель слоёв */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] flex gap-1 bg-black/55 backdrop-blur rounded-xl p-1">
          {([['tracks', 'Треки техники'], ['quality', 'Качество внесения'], ['plan', 'План/факт внесения'], ['work', 'Выработка · антифрод']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mode === k ? 'bg-white text-ink' : 'text-white/80 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        {mode === 'quality' && (
          <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg text-[11px] flex items-center gap-3">
            <span className="flex items-center gap-1"><i className="w-3 h-1 rounded-full bg-risk" />перекрытие/огрехи</span>
            <span className="flex items-center gap-1"><i className="w-3 h-1 rounded-full bg-ok" />в норме</span>
          </div>
        )}
        {mode === 'plan' && (
          <div className="absolute bottom-3 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg text-[11px] flex items-center gap-3">
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-ok" />обработано</span>
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-warn" />перекрытие</span>
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm bg-risk" />огрех</span>
            <span className="flex items-center gap-1"><i className="w-3 h-0.5 bg-black" />трек</span>
          </div>
        )}
        {/* легенда машин (в режиме план/факт скрыта — карта по полю) */}
        {mode !== 'plan' && <div className="absolute top-14 left-3 z-[500] bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg w-60">
          <div className="text-[11px] font-bold text-ink mb-1.5">Техника в поле</div>
          {MACHINES.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1 border-t border-line first:border-0">
              <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
              <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-ink truncate">{m.name}</div><div className="text-[10px] text-muted truncate">{m.operator}</div></div>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_TONE[m.status]}`}>{m.status}</span>
            </div>
          ))}
        </div>}
      </div>

      {/* вердикт план/факт внесения */}
      {mode === 'plan' && (
        <div className="bg-white border border-line rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 font-bold text-ink border-b border-line flex items-center gap-2"><Activity size={16} className="text-brand" />План/факт внесения · {sprayField.name} ({sprayField.crop}) · {sprayM.op} · {sprayM.name}</div>
          <div className="p-4 grid grid-cols-4 gap-3">
            <div className="rounded-xl bg-canvas p-3"><div className="text-xl font-extrabold text-ink">{planFact.coveragePct}%</div><div className="text-xs text-muted mt-0.5">покрыто площади · {planFact.coveredHa} из {sprayField.areaHa} га</div></div>
            <div className="rounded-xl bg-risk-soft/50 p-3"><div className="text-xl font-extrabold text-risk">{planFact.missHa} га</div><div className="text-xs text-muted mt-0.5">огрех (без обработки)</div></div>
            <div className="rounded-xl bg-warn-soft/50 p-3"><div className="text-xl font-extrabold text-warn">{planFact.overlapHa} га</div><div className="text-xs text-muted mt-0.5">двойной проход (перекрытие)</div></div>
            <div className="rounded-xl bg-canvas p-3"><div className="text-xl font-extrabold text-brand">{rub(planFact.overspendRub)}</div><div className="text-xs text-muted mt-0.5">перерасход СЗР от перекрытия</div></div>
          </div>
          <div className="px-4 pb-4 flex items-start gap-2 text-sm">
            <AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" />
            <div className="flex-1 text-ink">{(() => {
              const issues: string[] = []
              if (planFact.missHa > 0) issues.push(`${planFact.missHa} га огрех без защиты (риск недобора ≈ ${rub(planFact.undertreatRub)} материала + потенциальный недобор)`)
              if (planFact.overlapHa >= 3) issues.push(`${planFact.overlapHa} га двойной проход (перерасход СЗР ${rub(planFact.overspendRub)} + фитотоксичность)`)
              return issues.length === 0
                ? <>Карта-задание соблюдена: внесение покрыло {planFact.coveragePct}% площади по зонам, отклонения нормы в пределах допуска.</>
                : <>Карта-задание не соблюдена: <b>{issues.join('; ')}</b>. Разобрать с механизатором.</>
            })()}</div>
            <button onClick={() => askCopilot(`Разбери план/факт внесения по полю ${sprayField.name}: покрыто ${planFact.coveragePct}%, огрех ${planFact.missHa} га, двойной проход ${planFact.overlapHa} га, перерасход СЗР ${rub(planFact.overspendRub)}. Что делать механизатору и агроному?`)} className="shrink-0 text-xs font-bold text-brand inline-flex items-center gap-1 self-center"><Sparkles size={13} />Разобрать</button>
          </div>
        </div>
      )}

      {/* Выработка · антифрод (вкладка) */}
      {mode === 'work' && (
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="rounded-2xl border border-risk/30 bg-risk-soft/40 p-4 col-span-2">
              <div className="text-xs text-muted">Выявлено отклонений по телеметрии</div>
              <div className="text-2xl font-extrabold text-risk leading-none mt-1">{rub(ANTIFRAUD.total)}</div>
              <div className="text-xs text-muted mt-1">за смену · слив ГСМ {rub(ANTIFRAUD.drainRub)} + приписка га {rub(ANTIFRAUD.pripiskaRub)}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-extrabold text-ink">{ANTIFRAUD.flagged}</div><div className="text-xs text-muted mt-1">механизатора с отклонением</div></div>
            <div className="rounded-2xl border border-line bg-white p-4"><div className="text-2xl font-extrabold text-ink">{PAY_RATE} ₽/га</div><div className="text-xs text-muted mt-1">сдельная ставка · ЗП по факту GPS</div></div>
          </div>
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <div className="px-4 py-3 font-bold text-ink border-b border-line flex items-center gap-2"><Fuel size={15} className="text-brand" />Выработка по факту GPS · смена 16.06</div>
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">
                <th className="text-left font-medium p-3">Механизатор · техника</th>
                <th className="text-right font-medium p-3">Га: наряд / GPS-факт</th>
                <th className="text-right font-medium p-3">ГСМ норма / факт</th>
                <th className="text-right font-medium p-3">ЗП: начислено / по факту</th>
                <th className="text-left font-medium p-3">Флаг</th>
              </tr></thead>
              <tbody>
                {ANTIFRAUD.items.map((a) => {
                  const m = MACHINES.find((x) => x.name === a.machine)!
                  const flagTone = a.flag === 'слив' ? 'bg-risk-soft text-risk' : a.flag === 'приписка' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'
                  return (
                    <tr key={a.machine} onClick={() => setDrill(m)} className="border-b border-line last:border-0 hover:bg-canvas cursor-pointer">
                      <td className="p-3"><div className="font-semibold text-ink">{a.operator}</div><div className="text-xs text-muted">{a.machine} · {a.op}</div></td>
                      <td className="p-3 text-right">{a.haReported} / <b className={a.pripiska > 0 ? 'text-warn' : 'text-ink'}>{a.haFact}</b>{a.pripiska > 0 && <div className="text-[10px] text-warn">приписка {a.pripiska} га</div>}</td>
                      <td className="p-3 text-right">{m.fuelNorm} / <b className={a.drain ? 'text-risk' : 'text-ink'}>{m.fuelLPerHa}</b> л/га{a.drain && <div className="text-[10px] text-risk">+{a.overFuelL} л слив</div>}</td>
                      <td className="p-3 text-right">{rub(a.payAccrued)} / <b className="text-ink">{rub(a.payCorrect)}</b>{a.pripiskaRub > 0 && <div className="text-[10px] text-warn">переплата {rub(a.pripiskaRub)}</div>}</td>
                      <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${flagTone}`}>{a.flag}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2.5 text-[11px] text-muted border-t border-line">Га считаются по контуру GPS-трека (точность ~99,5%), ГСМ — по датчику уровня, ЗП — по факту выработки. Слив и приписки — с геоточкой и временем, юридическая база для удержания.</div>
          </div>
        </div>
      )}

      {mode !== 'work' && <div className="grid grid-cols-3 gap-4">
        {/* операции */}
        <div className="col-span-2 bg-white border border-line rounded-2xl overflow-hidden">
          <div className="px-4 py-3 font-bold text-ink border-b border-line">Операции · смена 16.06</div>
          <table className="w-full text-sm">
            <thead><tr className="text-muted text-xs border-b border-line bg-canvas/40">
              <th className="text-left font-medium p-3">Техника · механизатор</th>
              <th className="text-left font-medium p-3">Операция · поле</th>
              <th className="text-right font-medium p-3">Скорость</th>
              <th className="text-right font-medium p-3">ГСМ</th>
              <th className="text-right font-medium p-3">Площадь</th>
              <th className="text-left font-medium p-3">Статус</th>
            </tr></thead>
            <tbody>
              {MACHINES.map((m) => {
                const overSpeed = m.status === 'в работе' && m.op.includes('Опрыскивание') && m.speed > m.targetSpeed
                const overFuel = m.fuelLPerHa > m.fuelNorm * 1.15
                return (
                  <tr key={m.id} onClick={() => m.points.length > 0 && setDrill(m)} className={`border-b border-line last:border-0 hover:bg-canvas ${m.points.length > 0 ? 'cursor-pointer' : ''}`}>
                    <td className="p-3"><div className="font-semibold text-ink flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ background: m.color }} />{m.name}</div><div className="text-xs text-muted">{m.operator}</div></td>
                    <td className="p-3"><div className="text-ink">{m.op}</div><div className="text-xs text-muted">{m.fieldName} · {m.crop}</div></td>
                    <td className="p-3 text-right">{m.speed > 0 ? <span className={overSpeed ? 'text-risk font-bold' : 'text-ink'}>{m.speed} км/ч{overSpeed && <div className="text-[10px] text-risk">&gt; норма {m.targetSpeed}</div>}</span> : '—'}</td>
                    <td className="p-3 text-right">{m.fuelLPerHa > 0 ? <span className={overFuel ? 'text-risk font-bold' : 'text-muted'}>{m.fuelLPerHa} л/га</span> : '—'}</td>
                    <td className="p-3 text-right">{m.ha > 0 ? `${m.ha} га` : '—'}</td>
                    <td className="p-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[m.status]}`}>{m.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* алерты */}
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <div className="px-4 py-3 font-bold text-ink border-b border-line flex items-center gap-2"><AlertTriangle size={15} className="text-brand" />Алерты диспетчерской</div>
          <div className="divide-y divide-line">
            {ALERTS.map((a) => {
              const I = ALERT_ICON[a.kind]
              const tone = a.severity === 'risk' ? 'text-risk bg-risk-soft' : 'text-warn bg-warn-soft'
              return (
                <div key={a.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${tone}`}><I size={14} /></span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink leading-tight">{a.title}</div>
                      <div className="text-[11px] text-muted mt-0.5">{a.machine}</div>
                      <p className="text-xs text-muted mt-1 leading-snug">{a.detail}</p>
                      <div className="text-[11px] font-semibold text-brand mt-1">→ {a.action}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>}

      {/* Возможности платформы */}
      <div className="mt-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Инфраструктура платформы · от датчика до беспилотника</div>
        <div className="grid grid-cols-3 gap-4">
          <Cap icon={<Bot size={18} />} title="Беспилотный трактор на окно" body="Поставить автономную единицу на ночное окно опрыскивания (ветер 2 м/с, ΔT идеально). Платформа беспилотников платформы.">
            <button className="text-xs font-bold text-brand inline-flex items-center gap-1">Поставить на 02:00–05:00<ArrowRight size={12} /></button>
          </Cap>
          <Cap icon={<Wrench size={18} />} title="Предиктивное ТО" body="Датчик давления: форсунка №3 на опрыскивателе теряет 0,4 бар — замена до пиковой обработки. Прогноз отказа на 5 дней.">
            <span className="text-xs font-semibold text-warn">1 узел под наблюдением</span>
          </Cap>
          <Cap icon={<Fuel size={18} />} title="ГСМ-антифрод" body="Расходомер + маршрут: на «Внесении КАС» расход +40% при простое 38 мин. Алгоритм отметил аномалию слива.">
            <span className="text-xs font-semibold text-risk">1 инцидент к проверке</span>
          </Cap>
        </div>
      </div>

      {drill && <AntifraudDrill m={drill} onClose={() => setDrill(null)} />}
    </div>
  )
}

function AntifraudDrill({ m, onClose }: { m: Machine; onClose: () => void }) {
  const { askCopilot } = useApp()
  // факт-га = реальная GPS-площадь (m.ha); из неё восстанавливаем валовый проход и перекрытие
  // (серпантин-трек в данных разрежён, поэтому длину прохода считаем от факт-га, а не от точек)
  const widthM = m.widthM ?? 12
  const factHa = m.ha
  const swathHa = +(factHa / (1 - m.overlapPct / 100)).toFixed(1)
  const overlapHa = +(swathHa - factHa).toFixed(1)
  const lengthKm = +(((swathHa * 10000) / widthM) / 1000).toFixed(1)
  const reported = m.haReported ?? m.ha
  const delta = +(reported - factHa).toFixed(1)
  const deltaRub = Math.round(Math.max(0, delta) * PAY_RATE)
  const drain = m.fuelLPerHa > m.fuelNorm * 1.2
  const overFuelL = drain ? Math.round((m.fuelLPerHa - m.fuelNorm) * factHa) : 0
  const drainRub = Math.round(overFuelL * FUEL_PRICE)
  const endTime = addHours(m.start, m.durationH)

  const makeAkt = () => {
    const lines = [
      'АКТ контроля выработки (демонстрационный)',
      'Хозяйство: «Хлеборобное», Ростовская обл. · сезон 2026',
      `Механизатор: ${m.operator}`,
      `Техника: ${m.name} · ширина захвата ${widthM} м`,
      `Операция: ${m.op}`,
      `Поле (геозона): ${m.fieldName}`,
      `Смена 16.06: ${m.start}–${endTime} (${m.durationH} ч)`,
      '',
      `Га по GPS-треку: ${factHa} (проход ${widthM} м × ${lengthKm} км = ${swathHa} га − перекрытие ${m.overlapPct}% = ${overlapHa} га)`,
      `Заявлено в наряде: ${reported} га`,
      `Расхождение: ${delta} га${delta > 0 ? ` → переплата ЗП ${deltaRub} ₽ по ставке ${PAY_RATE} ₽/га` : ' (в норме)'}`,
      `ГСМ: норма ${m.fuelNorm} / факт ${m.fuelLPerHa} л/га${drain ? ` → слив/перерасход +${overFuelL} л = ${drainRub} ₽` : ' (в норме)'}`,
      '',
      'Основание: данные ГЛОНАСС/GPS (точность га ~99,5%) и датчика уровня топлива. Трек, геозона и время — в системе.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `akt_${m.operator.replace(/\W/g, '')}_1606.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const Row = ({ k, v, tone }: { k: string; v: React.ReactNode; tone?: string }) => (
    <div className="flex items-center justify-between py-1"><span className="text-xs text-muted">{k}</span><span className="font-semibold text-sm" style={{ color: tone }}>{v}</span></div>
  )

  return (
    <Modal open title={`Антифрод-сводка · ${m.operator}`} onClose={onClose}>
      <div className="text-sm text-muted mb-3">{m.name} · {m.op} · поле {m.fieldName} · смена 16.06 {m.start}–{endTime}</div>

      {/* факт-га из трека */}
      <div className="rounded-xl border border-line p-3 mb-3">
        <div className="font-bold text-ink text-sm mb-2">Факт-га из GPS-трека</div>
        <div className="flex gap-3">
          <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0 rounded-lg bg-canvas">
            <polyline points={trackThumb(m.points)} fill="none" stroke="#fc3f1d" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
          <div className="flex-1">
            <Row k={`Проход: ${widthM} м × ${lengthKm} км`} v={`${swathHa} га`} />
            <Row k={`Перекрытие ${m.overlapPct}%`} v={`−${overlapHa} га`} tone="#e0900a" />
            <div className="border-t border-line my-1" />
            <Row k="Факт-га по треку" v={`${factHa} га`} tone="#1a1a1a" />
            <Row k="Заявлено в наряде" v={`${reported} га`} />
            <Row k="Расхождение" v={delta > 0 ? `+${delta} га → ${rub(deltaRub)}` : 'в норме'} tone={delta > 0 ? '#e5302a' : '#2da84f'} />
          </div>
        </div>
      </div>

      {/* ГСМ */}
      <div className={`rounded-xl border p-3 mb-3 ${drain ? 'border-risk/40 bg-risk-soft/30' : 'border-line'}`}>
        <div className="font-bold text-ink text-sm mb-1.5 flex items-center gap-1.5"><Fuel size={14} className={drain ? 'text-risk' : 'text-muted'} />ГСМ</div>
        <Row k="Норма / факт" v={`${m.fuelNorm} / ${m.fuelLPerHa} л/га`} tone={drain ? '#e5302a' : undefined} />
        <Row k="Вердикт" v={drain ? `слив +${overFuelL} л = ${rub(drainRub)}` : 'в норме'} tone={drain ? '#e5302a' : '#2da84f'} />
      </div>

      {/* доказательство */}
      <div className="rounded-xl bg-canvas p-3 mb-3 text-xs text-muted">
        <b className="text-ink">Доказательство:</b> GPS-трек ({m.points.length} точек) · геозона «{m.fieldName}» · {m.start}–{endTime} (16.06). Точность га ~99,5% (ГЛОНАСС/GPS) + датчик уровня топлива. Юридическая база для удержания.
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => askCopilot(`Разбери антифрод по работе: ${m.operator} на ${m.name}, ${m.op}. Факт-га по GPS ${factHa}, заявлено ${reported}${delta > 0 ? ` (приписка ${delta} га)` : ''}, ГСМ ${m.fuelLPerHa} л/га при норме ${m.fuelNorm}${drain ? ` (слив +${overFuelL} л)` : ''}. Что сделать владельцу: удержание, разговор, регламент?`)} className="px-3 py-2 rounded-xl text-sm font-semibold text-brand border border-line hover:bg-canvas inline-flex items-center gap-1"><Sparkles size={14} />Разобрать с ассистентом</button>
        <button onClick={makeAkt} className="px-4 py-2 rounded-xl text-sm font-semibold bg-ink text-white inline-flex items-center gap-1.5"><ShieldAlert size={14} />Сформировать акт</button>
      </div>
    </Modal>
  )
}

function Kpi({ icon, v, l, accent }: { icon: React.ReactNode; v: string; l: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-muted mb-1">{icon}</div>
      <div className={`text-xl font-extrabold leading-none ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div>
      <div className="text-xs text-muted mt-1">{l}</div>
    </div>
  )
}
function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 border border-line text-ink font-semibold">{icon}{label}</span>
}
function Cap({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-4">
      <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand grid place-items-center mb-2">{icon}</div>
      <div className="font-bold text-ink text-sm mb-1">{title}</div>
      <p className="text-xs text-muted leading-snug mb-2">{body}</p>
      {children}
    </div>
  )
}
