// CRM семеновода: типы + обогащение аккаунтов + синтетические профильные хозяйства.
// База аккаунтов = госреестр (crmAccountsData.ts, реальные имена/ИНН) + профильные КФХ/
// агрохолдинги под подсолнечник (демо). Обогащение детерминированное (seeded PRNG).
import { HYBRIDS, recommendForZone } from './seedData'
import type { Status } from './data'
import { mulberry32, hash } from './utils'

export type RegistryRow = { name: string; inn: string; certNum: string; certState: string; signDate: string; expireDate: string }

export type AccountSource = 'реестр' | 'профильное'
export type AccountStatus = 'новый' | 'в работе' | 'демо' | 'контракт' | 'отказ'
export type AreaSource = 'заявка хозяйства' | 'оценка по NDVI' | 'реестр (груб. оценка)'
export type Consent = { yield: boolean; ndvi: boolean; agro: boolean }
export type Account = {
  id: string
  name: string
  short: string
  inn?: string
  source: AccountSource
  profile: string         // профиль/культура
  growsSunflower: boolean // сеет подсолнечник (целевой для семеновода)
  region: string
  zone: string
  stress: Status          // стресс зоны: ok/warn(сушит)/risk(горит) — приоритет привлечения
  areaHa: number          // оценка площади под подсолнечник
  areaSource: AreaSource  // честный источник оценки площади
  fitHybridId: string     // подобранный под зону гибрид
  certState?: string      // для реестра
  contactName: string
  channel: string         // исходный канал
  distributor?: string    // канал-атрибуция: через какого дистрибьютора (если есть)
  consent: Consent        // согласие хозяйства на шеринг данных (152-ФЗ)
  consentDate?: string
}

export type Contact = { id: string; accountId: string; name: string; role: string; phone: string; nextAction: string; due: string; status: 'новый' | 'дозвон' | 'встреча' | 'тишина' }
export type CaseStatus = 'черновик' | 'в Баттле' | 'оффер' | 'выигран' | 'проигран'
export type Case = {
  id: string; accountId: string; hybridId: string; status: CaseStatus; note: string
  amountRub: number       // сумма потенциальной сделки
  prob: number            // вероятность 0..1
  nextStep: string        // следующий шаг продавца
  blocker?: string        // что блокирует
}
export type SalesTask = { id: string; accountId: string; text: string; due: string; owner: string; status: 'новая' | 'в работе' | 'закрыта' }
export type BudgetLine = { channel: string; planRub: number; spentRub: number }

export const CHANNELS: { key: string; label: string; hint: string }[] = [
  { key: 'Выставка', label: 'Выставки', hint: 'ЮгАгро, Дни поля' },
  { key: 'Перформанс', label: 'Перформанс (Директ)', hint: 'платная реклама' },
  { key: 'Соцсети', label: 'Соцсети', hint: 'Telegram «АгроНадежды»' },
  { key: 'Сарафан', label: 'Сарафан', hint: 'рекомендации хозяйств' },
  { key: 'Демосеть', label: 'Демосеть', hint: '«Баттл» в поле' },
]

export const SALES_OWNERS = ['Надежда', 'Менеджер Олег', 'Менеджер Ирина']

// регион → зона
const ZONE_OF: Record<string, string> = {
  'Краснодарский край': 'Юг (богара)', 'Ростовская обл.': 'Юг (богара)', 'Ставропольский край': 'Юг (богара)',
  'Кабардино-Балкария': 'Юг (богара)',
  'Воронежская обл.': 'ЦЧО', 'Белгородская обл.': 'ЦЧО', 'Курская обл.': 'ЦЧО',
  'Саратовская обл.': 'Поволжье', 'Волгоградская обл.': 'Поволжье', 'Самарская обл.': 'Поволжье',
}
const REGIONS = Object.keys(ZONE_OF)
// стресс зоны (Юг богара — сушит/горит, ЦЧО спокойнее)
const ZONE_STRESS: Record<string, Status[]> = {
  'Юг (богара)': ['risk', 'risk', 'warn', 'ok'],
  'ЦЧО': ['ok', 'ok', 'warn'],
  'Поволжье': ['warn', 'risk', 'ok'],
}
const CONTACT_FIRST = ['Сергей', 'Андрей', 'Виктор', 'Дмитрий', 'Олег', 'Игорь', 'Павел', 'Николай', 'Роман', 'Алексей']
const CONTACT_LAST = ['Петров', 'Ковалёв', 'Сидоренко', 'Мороз', 'Гордеев', 'Власов', 'Шевченко', 'Лазарев', 'Гончар', 'Тарасов']

const pick = <T,>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length)]

// короткое имя компании для UI
function shorten(name: string): string {
  return name
    .replace(/ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ/gi, 'ООО')
    .replace(/АКЦИОНЕРНОЕ ОБЩЕСТВО/gi, 'АО').replace(/Акционерное общество/gi, 'АО').replace(/Акционерное Общество/gi, 'АО')
    .replace(/ПУБЛИЧНОЕ АО/gi, 'ПАО')
    .replace(/\s+/g, ' ').trim()
}
function profileOf(name: string): string {
  const n = name.toUpperCase()
  if (/АПАТИТ|УРАЛХИМ|АЗОТ|ФОСАГРО|ХИМ/.test(n)) return 'Производитель удобрений'
  if (/ОВОЩ|ДАРЫ ПРИРОДЫ|КРУГЛЫЙ ГОД|ТЕПЛИЦ/.test(n)) return 'Овощеводство / тепличное'
  if (/МОЛОК|МЯСО|ПТИЦ|ФЕРМ/.test(n)) return 'Животноводство'
  return 'Растениеводство'
}
function regionHint(name: string): string | null {
  const n = name.toUpperCase()
  if (/СТАВРОПОЛ/.test(n)) return 'Ставропольский край'
  if (/ЧЕГЕМ|КАБАРДИН/.test(n)) return 'Кабардино-Балкария'
  if (/ЧЕРНОЗЕМ|ВОРОНЕЖ/.test(n)) return 'Воронежская обл.'
  if (/КУБАН|КРАСНОДАР/.test(n)) return 'Краснодарский край'
  if (/ДОН|РОСТОВ/.test(n)) return 'Ростовская обл.'
  return null
}
function fitHybrid(zone: string, rnd: () => number): string {
  const ranked = recommendForZone(HYBRIDS, zone)
  const best = ranked.find((r) => !r.warn) ?? ranked[0]
  // иногда берём второй по рангу — чтобы портфель распределялся
  return (rnd() < 0.7 ? best : (ranked[1] ?? best)).h.id
}
function contactName(rnd: () => number): string { return `${pick(rnd, CONTACT_FIRST)} ${pick(rnd, CONTACT_LAST)}` }

// профильные хозяйства под подсолнечник (демо — целевой пул семеновода).
// distrib — закреплён за дистрибьютором Игорем (атрибуция канала, не блокировка).
const PROFILE_SEED: { name: string; region: string; areaHa: number; channel: string; distrib?: boolean }[] = [
  { name: 'КФХ Доброполье', region: 'Ростовская обл.', areaHa: 1800, channel: 'Демосеть' },
  { name: 'Агрохолдинг «Сальский»', region: 'Ростовская обл.', areaHa: 9500, channel: 'Выставка', distrib: true },
  { name: 'КФХ Прикумье', region: 'Ставропольский край', areaHa: 2400, channel: 'Сарафан', distrib: true },
  { name: 'ООО «Кубань-Олео»', region: 'Краснодарский край', areaHa: 6200, channel: 'Перформанс' },
  { name: 'КФХ Степной Ветер', region: 'Ставропольский край', areaHa: 1500, channel: 'Соцсети' },
  { name: 'ООО «Хопёр-Агро»', region: 'Воронежская обл.', areaHa: 3600, channel: 'Выставка' },
  { name: 'Агрофирма «Придонье»', region: 'Волгоградская обл.', areaHa: 5400, channel: 'Перформанс', distrib: true },
  { name: 'КФХ Заволжье', region: 'Саратовская обл.', areaHa: 2100, channel: 'Соцсети' },
  { name: 'ООО «Белогорье-Поле»', region: 'Белгородская обл.', areaHa: 4300, channel: 'Сарафан' },
  { name: 'КФХ Маныч', region: 'Ростовская обл.', areaHa: 1700, channel: 'Демосеть', distrib: true },
  { name: 'Агрохолдинг «Ставрополье-Зерно»', region: 'Ставропольский край', areaHa: 12000, channel: 'Выставка' },
  { name: 'КФХ Волго-Дон', region: 'Волгоградская обл.', areaHa: 1900, channel: 'Соцсети' },
  { name: 'КФХ Сальная Балка', region: 'Ростовская обл.', areaHa: 2200, channel: 'Сарафан', distrib: true },
  { name: 'ООО «Агро-Кавказ»', region: 'Ставропольский край', areaHa: 7800, channel: 'Выставка' },
  { name: 'КФХ Егорлык', region: 'Ростовская обл.', areaHa: 1400, channel: 'Демосеть' },
  { name: 'Агрофирма «Калач»', region: 'Воронежская обл.', areaHa: 4900, channel: 'Перформанс' },
  { name: 'ООО «Поволжская Нива»', region: 'Саратовская обл.', areaHa: 6700, channel: 'Выставка', distrib: true },
  { name: 'КФХ Эльтон', region: 'Волгоградская обл.', areaHa: 1600, channel: 'Соцсети' },
  { name: 'Агрохолдинг «Прикубанский»', region: 'Краснодарский край', areaHa: 14500, channel: 'Выставка' },
  { name: 'КФХ Дон-Степь', region: 'Ростовская обл.', areaHa: 2600, channel: 'Сарафан', distrib: true },
  { name: 'ООО «Зерно Юга»', region: 'Ставропольский край', areaHa: 8100, channel: 'Перформанс' },
  { name: 'КФХ Медвежий Лог', region: 'Воронежская обл.', areaHa: 1300, channel: 'Демосеть' },
]

// согласие хозяйства на шеринг (детерминированно): целевые шарят чаще
function consentOf(rnd: () => number): { consent: Consent; date?: string } {
  const y = rnd() < 0.65               // согласие на урожайность — ~65%
  const n = y || rnd() < 0.5           // NDVI шарят чаще (если уже дали урожай — точно)
  const a = y && rnd() < 0.55          // агротехнику — реже
  const day = 5 + Math.floor(rnd() * 24)
  return { consent: { yield: y, ndvi: n, agro: a }, date: y || n ? `${day < 10 ? '0' + day : day}.06.2026` : undefined }
}

export function buildAccounts(registry: RegistryRow[]): Account[] {
  const reg: Account[] = registry.map((r) => {
    const rnd = mulberry32(hash(r.inn))
    const region = regionHint(r.name) ?? pick(rnd, REGIONS)
    const zone = ZONE_OF[region]
    return {
      id: 'a_' + r.inn, name: r.name, short: shorten(r.name), inn: r.inn, source: 'реестр',
      profile: profileOf(r.name), growsSunflower: false, region, zone,
      stress: pick(rnd, ZONE_STRESS[zone] ?? ['ok']),
      areaHa: 800 + Math.floor(rnd() * 9000), areaSource: 'реестр (груб. оценка)',
      fitHybridId: fitHybrid(zone, rnd), certState: r.certState,
      contactName: contactName(rnd), channel: pick(rnd, ['Выставка', 'Перформанс', 'Сарафан']),
      consent: { yield: false, ndvi: false, agro: false },
    }
  })
  const prof: Account[] = PROFILE_SEED.map((p, i) => {
    const rnd = mulberry32(hash(p.name + i))
    const zone = ZONE_OF[p.region]
    const { consent, date } = consentOf(rnd)
    return {
      id: 'p_' + i, name: p.name, short: p.name, source: 'профильное',
      profile: 'Подсолнечник', growsSunflower: true, region: p.region, zone,
      stress: pick(rnd, ZONE_STRESS[zone] ?? ['warn', 'risk']),
      areaHa: p.areaHa, areaSource: rnd() < 0.6 ? 'заявка хозяйства' : 'оценка по NDVI',
      fitHybridId: fitHybrid(zone, rnd),
      contactName: contactName(rnd), channel: p.channel,
      distributor: p.distrib ? 'Игорь (Входы по Югу)' : undefined,
      consent, consentDate: date,
    }
  })
  // профильные — вперёд (целевые), затем реестр
  return [...prof, ...reg]
}

// начальный бюджет привлечения по каналам (демо)
export const BUDGET_INIT: BudgetLine[] = [
  { channel: 'Выставка', planRub: 1200000, spentRub: 940000 },
  { channel: 'Перформанс', planRub: 600000, spentRub: 410000 },
  { channel: 'Соцсети', planRub: 180000, spentRub: 120000 },
  { channel: 'Сарафан', planRub: 0, spentRub: 0 },
  { channel: 'Демосеть', planRub: 800000, spentRub: 560000 },
]
