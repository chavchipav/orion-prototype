// Парсит госреестр производителей продукции «с улучшенными характеристиками»
// (data/...xml) → закоммиченный src/crmAccountsData.ts (офлайн dummy для CRM).
// Дедуп компаний по ИНН; для дублей берём действующий сертификат / самый свежий.
//
// Запуск: node scripts/parseRegistry.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')
const DATA_DIR = resolve(APP_DIR, '..', 'data')

const xmlName = readdirSync(DATA_DIR).find((f) => f.endsWith('.xml') && f.includes('улучшенными'))
if (!xmlName) { console.error('XML реестра не найден в', DATA_DIR); process.exit(1) }
const xml = readFileSync(join(DATA_DIR, xmlName), 'utf8')

const tag = (chunk, t) => { const m = chunk.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].trim().replace(/\s+/g, ' ') : '' }
const items = xml.split('<item>').slice(1).map((c) => ({
  name: tag(c, 'PROIZVODITELNAME'),
  inn: tag(c, 'PROIZVODITELINN'),
  certNum: tag(c, 'CERTNUM'),
  state: tag(c, 'CERTSTATE'),
  signDate: tag(c, 'CERTDATESIGN'),
  expireDate: tag(c, 'CERTEXPIRE'),
})).filter((x) => x.name && x.inn)

// дедуп по ИНН: предпочесть «Действует», затем самую свежую подпись
const ddmmyyyy = (s) => { const [d, m, y] = (s || '').split('.').map(Number); return (y || 0) * 372 + (m || 0) * 31 + (d || 0) }
const byInn = new Map()
for (const it of items) {
  const cur = byInn.get(it.inn)
  if (!cur) { byInn.set(it.inn, it); continue }
  const better = (it.state === 'Действует' && cur.state !== 'Действует') ||
    (it.state === cur.state && ddmmyyyy(it.signDate) > ddmmyyyy(cur.signDate))
  if (better) byInn.set(it.inn, it)
}
const rows = [...byInn.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const body = rows.map((r) =>
  `  { name: '${esc(r.name)}', inn: '${r.inn}', certNum: '${esc(r.certNum)}', certState: '${esc(r.state)}', signDate: '${r.signDate}', expireDate: '${r.expireDate}' },`
).join('\n')

const out = `// АВТО-ГЕНЕРАЦИЯ — не редактируй вручную (node scripts/parseRegistry.mjs).
// Источник: «${xmlName}» (госреестр производителей продукции с улучшенными характеристиками).
// ${rows.length} компаний (дедуп по ИНН из ${items.length} записей). Реальные имена/ИНН/сертстатус — dummy-аккаунты CRM.
import type { RegistryRow } from './crmData'

export const REGISTRY_ROWS: RegistryRow[] = [
${body}
]
`
writeFileSync(join(APP_DIR, 'src', 'crmAccountsData.ts'), out)
console.log(`✓ src/crmAccountsData.ts — ${rows.length} компаний из ${items.length} записей`)
