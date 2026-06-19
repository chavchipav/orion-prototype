// ─────────────────────────────────────────────────────────────
// Одноразовый build-скрипт: тянет реальные контуры полей (landuse=farmland)
// из OpenStreetMap через Overpass API и пишет src/agronomFieldsGeo.ts.
// Запуск: node scripts/fetchFields.mjs
// Результат коммитится — приложение работает офлайн, без обращений к API.
// ─────────────────────────────────────────────────────────────
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── Параметры кластера (подбираются визуально по чистоте снимка Esri) ──
// Зимовники, Ростовская обл. — крупные степные поля, чистые контуры OSM.
const CENTER = [47.21, 42.45]
const BBOX = [47.10, 42.28, 47.32, 42.62] // s,w,n,e
const WANT = 20
const AREA_MIN = 40, AREA_MAX = 320 // га
const MAX_NODES = 26

const OVERPASS = 'https://overpass-api.de/api/interpreter'

function shoelaceHa(ring) {
  const la = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const mlat = 111320, mlon = 111320 * Math.cos((la * Math.PI) / 180)
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length
    a += ring[i][1] * mlon * (ring[j][0] * mlat) - ring[j][1] * mlon * (ring[i][0] * mlat)
  }
  return Math.abs(a) / 2 / 10000
}
function centroid(ring) {
  const la = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const ln = ring.reduce((s, p) => s + p[1], 0) / ring.length
  return [la, ln]
}
// Douglas–Peucker (планарно по lat/lng — ок на таком масштабе)
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  let dmax = 0, idx = 0
  const [a, b] = [pts[0], pts[pts.length - 1]]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], a, b)
    if (d > dmax) { dmax = d; idx = i }
  }
  if (dmax > eps) {
    const l = rdp(pts.slice(0, idx + 1), eps)
    const r = rdp(pts.slice(idx), eps)
    return l.slice(0, -1).concat(r)
  }
  return [a, b]
}
function perp(p, a, b) {
  const [py, px] = p, [ay, ax] = a, [by, bx] = b
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1e-9
  return Math.abs((px - ax) * dy - (py - ay) * dx) / len
}
function simplifyToCap(ring) {
  let r = ring
  let eps = 0
  while (r.length > MAX_NODES && eps < 0.01) {
    eps += 0.0002
    r = rdp(ring, eps)
  }
  return r
}

async function main() {
  const [s, w, n, e] = BBOX
  const ql = `[out:json][timeout:60];(way["landuse"="farmland"](${s},${w},${n},${e}););out geom;`
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': 'yandex-agro-proto/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: ql }),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const data = await res.json()
  const ways = (data.elements || []).filter((x) => x.type === 'way' && x.geometry && x.geometry.length >= 4)

  let fields = ways.map((wy) => {
    let ring = wy.geometry.map((p) => [p.lat, p.lon])
    // снять дубль замыкающей точки
    if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1)
    ring = simplifyToCap(ring).map(([a, b]) => [Math.round(a * 1e6) / 1e6, Math.round(b * 1e6) / 1e6])
    return { ring, areaHa: Math.round(shoelaceHa(ring) * 10) / 10, c: centroid(ring), nodes: ring.length }
  }).filter((f) => f.areaHa >= AREA_MIN && f.areaHa <= AREA_MAX && f.nodes <= MAX_NODES && f.nodes >= 4)

  // плотный КОМПАКТНЫЙ кластер: находим самое густое место (поле с макс. числом
  // соседей в радиусе R), берём WANT ближайших к нему → круглый плотный массив,
  // а не цепочка узких полей (тогда подписи не налезают, поля крупнее на экране).
  const R = 0.028 // ~3 км
  let seed = fields[0], best = -1
  for (const f of fields) {
    const cnt = fields.reduce((s, g) => s + (dist(f.c, g.c) < R ? 1 : 0), 0)
    if (cnt > best) { best = cnt; seed = f }
  }
  fields.sort((a, b) => dist(a.c, seed.c) - dist(b.c, seed.c))
  fields = fields.slice(0, WANT)
  // отсортировать по широте↓, затем долготе → стабильный порядок ХБ01.. сверху-вниз/слева-направо
  fields.sort((a, b) => (b.c[0] - a.c[0]) || (a.c[1] - b.c[1]))

  const lats = fields.flatMap((f) => f.ring.map((p) => p[0]))
  const lngs = fields.flatMap((f) => f.ring.map((p) => p[1]))
  const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]
  const ctr = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2].map((x) => Math.round(x * 1e6) / 1e6)

  const out = `// АВТО-СГЕНЕРИРОВАНО scripts/fetchFields.mjs — НЕ редактировать вручную.
// Реальные контуры полей (OSM landuse=farmland), Ростовская обл. (Зимовники).
// Поля выбраны компактным кластером вокруг центра; площадь — шуласе по контуру.
export type GeoField = { ring: [number, number][]; areaHa: number }

export const GEO_FIELDS: GeoField[] = ${serializeFields(fields)}

export const GEO_CENTER: [number, number] = [${ctr[0]}, ${ctr[1]}]
export const GEO_BOUNDS: [[number, number], [number, number]] = ${JSON.stringify(bounds)}
`
  const here = dirname(fileURLToPath(import.meta.url))
  const dest = join(here, '..', 'src', 'agronomFieldsGeo.ts')
  writeFileSync(dest, out)
  console.log(`OK: ${fields.length} полей → src/agronomFieldsGeo.ts`)
  console.log(`center=${ctr.join(',')} bounds=${JSON.stringify(bounds)}`)
  console.log('areas(ha):', fields.map((f) => f.areaHa).join(', '))
  console.log('nodes:', fields.map((f) => f.nodes).join(', '))
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]) }
function serializeFields(fields) {
  const rows = fields.map((f) => `  { areaHa: ${f.areaHa}, ring: ${JSON.stringify(f.ring)} },`)
  return `[\n${rows.join('\n')}\n]`
}
main().catch((e) => { console.error(e); process.exit(1) })
