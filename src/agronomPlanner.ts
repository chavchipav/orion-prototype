// ─────────────────────────────────────────────────────────────
// Проактивный планировщик работ («Ассистент»). Отвечает на вопрос
// «куда падают действия НЕ из осмотров»: плановые операции (техкарта+фенофаза)
// прогоняются через ЧЕСТНЫЙ движок погодного окна и получают рекомендованное
// время — день/ночь, с агрономическим обоснованием (ветер, осадки/влагостойкость,
// жара → ночь, температурная инверсия, пчёлы). Все данные — демо-прототип.
// ─────────────────────────────────────────────────────────────
import { AG_FIELDS, type AgField, type Crop } from './agronomData'
import { TODAY } from './agronomSeason'

// 'DD.MM' → день года
function doy(d: string): number {
  const [dd, mm] = d.split('.').map(Number)
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  return cum[mm - 1] + dd
}
function addDays(d: string, n: number): string {
  const cum = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let [dd, mm] = d.split('.').map(Number)
  dd += n
  while (dd > cum[mm - 1]) { dd -= cum[mm - 1]; mm++; if (mm > 12) mm = 1 }
  return `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}`
}

// ── Прогноз на 12 дней от «сегодня» (07.07). Ростовская обл., июль ──
// Сценарий: жаркий ветреный старт → короткий фронт с осадками (10–11.07) →
// тихое прохладное окно после фронта. clearNight = ясная тихая ночь (инверсия + роса).
export type DayWx = {
  date: string; dow: string
  tMax: number; tMin: number
  windDay: number; windNight: number // м/с
  humidity: number; rainMm: number
  clearNight: boolean
}
export const FORECAST: DayWx[] = (() => {
  const dows = ['Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс', 'Пн']
  const rows: Omit<DayWx, 'date' | 'dow'>[] = [
    { tMax: 33, tMin: 20, windDay: 6, windNight: 2, humidity: 38, rainMm: 0, clearNight: true },   // 07.07 жара, ветер днём, ясная ночь (инверсия)
    { tMax: 34, tMin: 21, windDay: 7, windNight: 3, humidity: 35, rainMm: 0, clearNight: true },   // 08.07 жара, порывы
    { tMax: 35, tMin: 22, windDay: 5, windNight: 2, humidity: 33, rainMm: 0, clearNight: true },   // 09.07 пик жары
    { tMax: 27, tMin: 18, windDay: 8, windNight: 6, humidity: 70, rainMm: 9, clearNight: false },  // 10.07 фронт, дождь, ветер
    { tMax: 24, tMin: 16, windDay: 6, windNight: 4, humidity: 75, rainMm: 6, clearNight: false },  // 11.07 дождь добивает
    { tMax: 23, tMin: 15, windDay: 3, windNight: 2, humidity: 60, rainMm: 0, clearNight: false },  // 12.07 ✅ прохладно, тихо, облачно
    { tMax: 25, tMin: 15, windDay: 3, windNight: 2, humidity: 55, rainMm: 0, clearNight: false },  // 13.07 ✅ окно
    { tMax: 26, tMin: 16, windDay: 4, windNight: 1, humidity: 50, rainMm: 0, clearNight: true },   // 14.07 тёплый, ночь ясная
    { tMax: 28, tMin: 17, windDay: 4, windNight: 2, humidity: 45, rainMm: 0, clearNight: false },  // 15.07
    { tMax: 30, tMin: 18, windDay: 5, windNight: 3, humidity: 42, rainMm: 0, clearNight: false },  // 16.07
    { tMax: 31, tMin: 19, windDay: 6, windNight: 2, humidity: 40, rainMm: 0, clearNight: true },   // 17.07
    { tMax: 32, tMin: 20, windDay: 6, windNight: 3, humidity: 38, rainMm: 1, clearNight: false },  // 18.07
  ]
  return rows.map((r, i) => ({ ...r, date: addDays(TODAY, i), dow: dows[i % 7] }))
})()

const wxByDate = new Map(FORECAST.map((d) => [d.date, d]))
// сумма осадков за N дней начиная с date (для влагостойкости)
function rainNext(date: string, days: number): number {
  let s = 0
  for (let k = 0; k < days; k++) { const w = wxByDate.get(addDays(date, k)); if (w) s += w.rainMm }
  return s
}

// ── Профиль операции: агрономические требования к окну ──
export type OpKind = 'Гербицид' | 'Фунгицид' | 'Инсектицид' | 'Десикант' | 'Подкормка' | 'Сев' | 'Почвообработка' | 'Уборка' | 'Прочее'
type OpProfile = { windMax: number; heatSensitive: boolean; beeSafe: boolean; rainFreeDays: number; sprayed: boolean }
function profile(kind: OpKind): OpProfile {
  switch (kind) {
    case 'Гербицид': return { windMax: 5, heatSensitive: true, beeSafe: false, rainFreeDays: 1, sprayed: true }
    case 'Инсектицид': return { windMax: 5, heatSensitive: true, beeSafe: true, rainFreeDays: 1, sprayed: true }
    case 'Фунгицид': return { windMax: 5, heatSensitive: false, beeSafe: false, rainFreeDays: 1, sprayed: true }
    case 'Десикант': return { windMax: 5, heatSensitive: false, beeSafe: false, rainFreeDays: 1, sprayed: true }
    case 'Подкормка': return { windMax: 4, heatSensitive: true, beeSafe: false, rainFreeDays: 0, sprayed: true } // КАС: ожог по жаре → ночь
    default: return { windMax: 8, heatSensitive: false, beeSafe: false, rainFreeDays: 0, sprayed: false }       // сев/уборка/обработка — не опрыскивание
  }
}

// ── ЧЕСТНЫЙ движок окна ──
export type TimeBand = 'ночь' | 'утро' | 'день'
export type Window = {
  date: string; dow: string; band: TimeBand; fromH: string; toH: string; night: boolean
  score: number; reasons: string[]; blockers: { date: string; why: string }[]
  leadDays: number; feasible: boolean
}

// оценка дневного/ночного окна конкретного дня
function evalDay(w: DayWx, p: OpProfile) {
  const rain = rainNext(w.date, p.rainFreeDays + 1)
  // ДЕНЬ
  let day = { ok: true, why: [] as string[], block: '' }
  if (w.windDay > p.windMax) { day.ok = false; day.block = `ветер днём ${w.windDay} м/с` }
  else if (w.windDay < 1) { day.ok = false; day.block = 'штиль днём (риск инверсии/сноса)' }
  if (rain > 1) { day.ok = false; day.block = `осадки ${rain} мм в окне влагостойкости` }
  if (p.heatSensitive && w.tMax >= 27) { day.ok = false; day.block = `жара днём ${w.tMax}°` }
  if (p.beeSafe) { day.ok = false; day.block = 'днём активны пчёлы' }
  if (day.ok) { day.why.push(`ветер ${w.windDay} м/с`, p.rainFreeDays ? `${p.rainFreeDays} дн без осадков` : 'без осадков', w.tMax < 27 ? `не жарко (${w.tMax}°)` : '') }
  // НОЧЬ
  let night = { ok: true, why: [] as string[], block: '' }
  if (w.windNight > p.windMax) { night.ok = false; night.block = `ветер ночью ${w.windNight} м/с` }
  else if (w.clearNight) { night.ok = false; night.block = 'ясная тихая ночь → температурная инверсия' }
  if (rain > 1) { night.ok = false; night.block = `осадки ${rain} мм в окне влагостойкости` }
  if (night.ok) { night.why.push(`ветер ночью ${w.windNight} м/с`, 'нет инверсии', p.heatSensitive ? `прохладнее (${w.tMin}°)` : '', p.beeSafe ? 'пчёлы не лётают' : '') }
  return { day, night, rain }
}

export function planWindow(kind: OpKind, earliest: string): Window {
  const p = profile(kind)
  if (!p.sprayed) {
    // не опрыскивание — окно по сухости/ветру, без «ночь»
    for (const w of FORECAST) {
      if (doy(w.date) < doy(earliest)) continue
      if (rainNext(w.date, 1) <= 1 && w.windDay <= p.windMax) {
        return { date: w.date, dow: w.dow, band: 'день', fromH: '07:00', toH: '20:00', night: false, score: 80, reasons: ['сухо', `ветер ${w.windDay} м/с`], blockers: [], leadDays: doy(w.date) - doy(TODAY), feasible: true }
      }
    }
  }
  const blockers: { date: string; why: string }[] = []
  for (const w of FORECAST) {
    if (doy(w.date) < doy(earliest)) continue
    const e = evalDay(w, p)
    // приоритет: для термочувствительных/пчелобезопасных в жару — ночь, иначе раннее утро/день
    const preferNight = (p.beeSafe) || (p.heatSensitive && w.tMax >= 27)
    if (preferNight && e.night.ok) {
      return mkWin(w, 'ночь', '22:00', '05:00', true, e.night.why, blockers, p)
    }
    if (!preferNight && e.day.ok) {
      // термочувствительные лучше раннее утро (после распада инверсии)
      const morning = p.heatSensitive
      return mkWin(w, morning ? 'утро' : 'день', morning ? '06:00' : '08:00', morning ? '10:00' : '20:00', false, e.day.why, blockers, p)
    }
    if (preferNight && e.day.ok && !e.night.ok) {
      return mkWin(w, 'утро', '06:00', '10:00', false, e.day.why, blockers, p)
    }
    // день не подошёл — копим блокеры
    const why = e.day.block || e.night.block
    if (why) blockers.push({ date: w.date, why })
  }
  // окна нет в горизонте
  return { date: earliest, dow: '', band: 'день', fromH: '', toH: '', night: false, score: 0, reasons: [], blockers, leadDays: doy(earliest) - doy(TODAY), feasible: false }
}
function mkWin(w: DayWx, band: TimeBand, fromH: string, toH: string, night: boolean, why: string[], blockers: { date: string; why: string }[], p: OpProfile): Window {
  const reasons = why.filter(Boolean)
  if (night && p.heatSensitive) reasons.unshift(`жара днём → переносим в ночь`)
  const score = Math.max(40, 95 - blockers.length * 8 - (doy(w.date) - doy(TODAY)))
  return { date: w.date, dow: w.dow, band, fromH, toH, night, score, reasons, blockers, leadDays: doy(w.date) - doy(TODAY), feasible: true }
}

// ── Источник плановых работ: ближайшая плановая операция по каждому полю ──
export type PlanSource = 'плановая' | 'по фенофазе'
export type PlanTask = {
  id: string; field: AgField; crop: Crop; op: string; kind: OpKind; phase?: string
  product?: string; earliest: string; window: Window; source: PlanSource
  status: 'запланировано' | 'в работе' | 'выполнено'; assignee: string
}
const ASSIGN = ['Иванов А. (К-744)', 'Петров С. (МТЗ-1221)', 'Сидоров К. (John Deere 8R)']

// плановые операции середины июля по культуре (фенофаза + продукт + самый ранний срок).
// движок сам решит день/ночь по погоде — показываем реальный горизонт «сегодня + 12 дней».
type OpTpl = { op: string; kind: OpKind; phase: string; product: string; earliest: string }
const TEMPLATE: Partial<Record<Crop, OpTpl[]>> = {
  'Кукуруза': [
    { op: 'Инсектицид (луговой мотылёк)', kind: 'Инсектицид', phase: 'Выметывание/цветение', product: 'Децис Эксперт 0,125 л/га', earliest: '07.07' },
    { op: 'Листовая подкормка (B, Zn)', kind: 'Подкормка', phase: 'Налив зерна', product: 'Микро B+Zn 1,5 л/га', earliest: '15.07' },
  ],
  'Подсолнечник': [
    { op: 'Фунгицид (склеротиниоз)', kind: 'Фунгицид', phase: 'Цветение', product: 'Прозаро 0,8 л/га', earliest: '08.07' },
    { op: 'Листовая подкормка (бор)', kind: 'Подкормка', phase: 'Цветение', product: 'Бор 1,0 л/га', earliest: '07.07' },
  ],
  'Соя': [
    { op: 'Гербицид (вторая волна)', kind: 'Гербицид', phase: 'Ветвление', product: 'Фабиан 0,1 кг/га', earliest: '12.07' },
    { op: 'Фунгицид (пероноспороз)', kind: 'Фунгицид', phase: 'Цветение', product: 'Прозаро 0,8 л/га', earliest: '13.07' },
  ],
  'Озимая пшеница': [{ op: 'Десикация перед уборкой', kind: 'Десикант', phase: 'Восковая спелость', product: 'Реглон 2,0 л/га', earliest: '09.07' }],
  'Яровой ячмень': [{ op: 'Десикация перед уборкой', kind: 'Десикант', phase: 'Налив', product: 'Реглон 2,0 л/га', earliest: '08.07' }],
  'Горох': [{ op: 'Инсектицид (зерновка)', kind: 'Инсектицид', phase: 'Цветение', product: 'Карате Зеон 0,15 л/га', earliest: '07.07' }],
}

export function buildPlan(): PlanTask[] {
  const out: PlanTask[] = []
  const seen: Record<string, number> = {}
  AG_FIELDS.forEach((f, i) => {
    const tpls = TEMPLATE[f.crop]
    if (!tpls) return
    const k = seen[f.crop] = (seen[f.crop] ?? -1) + 1
    const t = tpls[k % tpls.length]
    const window = planWindow(t.kind, t.earliest)
    out.push({
      id: 'pt-' + f.id, field: f, crop: f.crop, op: t.op, kind: t.kind, phase: t.phase,
      product: t.product, earliest: t.earliest, window, source: 'по фенофазе',
      status: 'запланировано', assignee: ASSIGN[i % 3],
    })
  })
  // сначала осуществимые с ближайшим окном, неосуществимые — вниз
  return out.sort((a, b) => Number(b.window.feasible) - Number(a.window.feasible) || a.window.leadDays - b.window.leadDays).slice(0, 10)
}

// пригодность дня для опрыскивания (для полоски прогноза): 0 нельзя · 1 ночь · 2 день
export function spraySuitability(w: DayWx): 0 | 1 | 2 {
  if (w.rainMm > 1) return 0
  if (w.windDay >= 1 && w.windDay <= 5 && w.tMax < 27) return 2
  if (w.windNight <= 5 && !w.clearNight) return 1
  return 0
}
