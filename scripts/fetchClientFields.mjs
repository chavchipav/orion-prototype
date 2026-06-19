// ─────────────────────────────────────────────────────────────
// Build-скрипт: реальные контуры полей клиентов семеновода (OSM farmland)
// для drill-in карты кабинета Genesis. Один реальный участок на клиента,
// рядом с его регионом. Пишет src/seedFieldsGeo.ts. Коммитится.
// Запуск: node scripts/fetchClientFields.mjs
// ─────────────────────────────────────────────────────────────
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// клиент → регион (порядок как в seedData.CLIENT_FIELDS_INIT)
const CLIENTS = [
  { id: 'c1', region: 'Ростовская' }, { id: 'c2', region: 'Ростовская' },
  { id: 'c3', region: 'Ставропольский' }, { id: 'c4', region: 'Воронежская' },
  { id: 'c5', region: 'Краснодарский' }, { id: 'c6', region: 'Саратовская' },
  { id: 'c7', region: 'Курская' }, { id: 'c8', region: 'Ростовская' },
]
// точки запроса — там, где в OSM есть поштучные контуры пашни
const REGION_Q = {
  'Ростовская': [47.21, 42.45], 'Ставропольский': [45.10, 42.00],
  'Краснодарский': [45.30, 39.50], 'Воронежская': [51.00, 39.50],
  'Саратовская': [51.40, 45.20], 'Курская': [51.65, 36.30],
}
const AREA_MIN = 40, AREA_MAX = 400, MAX_NODES = 26, R = 0.16
const OVERPASS = 'https://overpass-api.de/api/interpreter'

const shoelaceHa = (ring) => {
  const la = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const mlat = 111320, mlon = 111320 * Math.cos((la * Math.PI) / 180)
  let a = 0
  for (let i = 0; i < ring.length; i++) { const j = (i + 1) % ring.length; a += ring[i][1] * mlon * (ring[j][0] * mlat) - ring[j][1] * mlon * (ring[i][0] * mlat) }
  return Math.abs(a) / 2 / 10000
}
const centroid = (ring) => [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length]
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const r6 = (x) => Math.round(x * 1e6) / 1e6

async function fetchRegion(center) {
  const [la, ln] = center
  const ql = `[out:json][timeout:60];(way["landuse"="farmland"](${la - R},${ln - R},${la + R},${ln + R}););out geom;`
  let res, attempt = 0
  while (attempt < 5) {
    res = await fetch(OVERPASS, { method: 'POST', headers: { 'User-Agent': 'yandex-agro-proto/1.0', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: ql }) })
    if (res.ok) break
    attempt++
    await new Promise((r) => setTimeout(r, 4000 * attempt)) // бэк-офф на 429
  }
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  return (data.elements || []).filter((w) => w.type === 'way' && w.geometry && w.geometry.length >= 4).map((w) => {
    let ring = w.geometry.map((p) => [p.lat, p.lon])
    if (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1)
    ring = ring.map(([a, b]) => [r6(a), r6(b)])
    return { ring, areaHa: Math.round(shoelaceHa(ring) * 10) / 10, c: centroid(ring), nodes: ring.length }
  }).filter((f) => f.areaHa >= AREA_MIN && f.areaHa <= AREA_MAX && f.nodes <= MAX_NODES)
}

async function main() {
  const byRegion = {}
  const out = {}
  for (const cl of CLIENTS) {
    if (!byRegion[cl.region]) {
      const ctr = REGION_Q[cl.region]
      try {
        await new Promise((r) => setTimeout(r, 2500)) // пауза против rate-limit Overpass
        const cand = (await fetchRegion(ctr)).sort((a, b) => dist(a.c, ctr) - dist(b.c, ctr))
        byRegion[cl.region] = { pool: cand, used: 0 }
        console.log(`${cl.region}: ${cand.length} полей`)
      } catch (e) { console.log(`${cl.region}: ERR ${e.message}`); byRegion[cl.region] = { pool: [], used: 0 } }
    }
    const b = byRegion[cl.region]
    const f = b.pool[b.used++]
    if (f) out[cl.id] = { ring: f.ring, center: f.c.map(r6), areaHa: f.areaHa }
    else console.log(`  ! ${cl.id} (${cl.region}) — нет реального поля, будет fallback`)
  }
  const body = Object.entries(out).map(([id, v]) =>
    `  '${id}': { areaHa: ${v.areaHa}, center: [${v.center[0]}, ${v.center[1]}], ring: ${JSON.stringify(v.ring)} },`).join('\n')
  const ts = `// АВТО-СГЕНЕРИРОВАНО scripts/fetchClientFields.mjs — НЕ редактировать вручную.
// Реальные контуры полей клиентов семеновода (OSM landuse=farmland), по регионам.
// Клиенты без записи рендерятся через стилизованный fieldRing (fallback).
export type ClientGeo = { ring: [number, number][]; center: [number, number]; areaHa: number }
export const CLIENT_GEO: Record<string, ClientGeo> = {
${body}
}
`
  const here = dirname(fileURLToPath(import.meta.url))
  writeFileSync(join(here, '..', 'src', 'seedFieldsGeo.ts'), ts)
  console.log(`OK: ${Object.keys(out).length}/${CLIENTS.length} клиентов → src/seedFieldsGeo.ts`)
}
main().catch((e) => { console.error(e); process.exit(1) })
