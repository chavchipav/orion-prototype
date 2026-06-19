// ─────────────────────────────────────────────────────────────
// Телематика: парк техники в поле. Строится на GPS_TRACKS (реальные
// серпантинные проходы по контуру) + AG_FIELDS (контекст поля/NDVI) +
// погодная аномалия. Не просто «показать трек», а контроль качества:
// перекрытие/огрехи, скорость внесения, ГСМ-антифрод, геозона, и
// ИИ-сшивка GPS × NDVI × Погода (то, чего нет у конкурентов).
// ─────────────────────────────────────────────────────────────
import { GPS_TRACKS } from './agronomData2'
import { AG_FIELDS, type LatLng, type Crop } from './agronomData'
import { ANOMALY } from './agronomWeather'

export type MachineStatus = 'в работе' | 'простой' | 'на стоянке'
export type AlertKind = 'перекрытие' | 'скорость' | 'простой' | 'геозона' | 'ГСМ'

export type Machine = {
  id: string
  name: string
  operator: string
  color: string
  fieldId: string
  fieldName: string
  crop: Crop
  ndvi: number
  op: string            // операция
  status: MachineStatus
  speed: number         // текущая, км/ч
  targetSpeed: number   // агротребование (макс. для качества)
  ha: number            // обработано
  fuelLPerHa: number    // факт расход ГСМ
  fuelNorm: number      // паспортная норма
  overlapPct: number    // перекрытие проходов
  missPct: number       // огрехи (пропуски)
  start: string
  durationH: number
  points: LatLng[]
  haReported?: number   // га по наряду/табелю (если > факта по GPS → приписка)
  widthM?: number       // ширина захвата агрегата, м (для расчёта га из трека)
}

// 3 машины из GPS_TRACKS (реальные треки) + 1 на стоянке (контекст парка).
const TR = GPS_TRACKS
function f(i: number) { return AG_FIELDS[i] }

export const MACHINES: Machine[] = [
  {
    id: 'm1', name: TR[0].machine, operator: TR[0].operator, color: TR[0].color,
    fieldId: f(0).id, fieldName: f(0).name, crop: f(0).crop, ndvi: f(0).ndvi, // трек TR[0] = серпантин по AG_FIELDS[0]
    op: 'Опрыскивание (фунгицид)', status: 'в работе',
    speed: 11.4, targetSpeed: 8, ha: TR[0].ha, fuelLPerHa: 9.8, fuelNorm: 8.5,
    overlapPct: 12, missPct: 3, start: '07:20', durationH: 4.2, points: TR[0].points, haReported: 124, widthM: 24,
  },
  {
    id: 'm2', name: TR[1].machine, operator: TR[1].operator, color: TR[1].color,
    fieldId: f(6).id, fieldName: f(6).name, crop: f(6).crop, ndvi: f(6).ndvi,
    op: 'Культивация', status: 'в работе',
    speed: 7.8, targetSpeed: 10, ha: TR[1].ha, fuelLPerHa: 7.6, fuelNorm: 7.8,
    overlapPct: 4, missPct: 1, start: '06:40', durationH: 5.1, points: TR[1].points, widthM: 12,
  },
  {
    id: 'm3', name: TR[2].machine, operator: TR[2].operator, color: TR[2].color,
    fieldId: f(11).id, fieldName: f(11).name, crop: f(11).crop, ndvi: f(11).ndvi, // трек TR[2] = серпантин по AG_FIELDS[11]
    op: 'Внесение КАС', status: 'простой',
    speed: 0, targetSpeed: 9, ha: TR[2].ha, fuelLPerHa: 11.2, fuelNorm: 8.0,
    overlapPct: 6, missPct: 2, start: '08:05', durationH: 3.4, points: TR[2].points, widthM: 18,
  },
  {
    id: 'm4', name: 'Amazone UX 5200', operator: 'Кузнецов Д.', color: '#2da84f',
    fieldId: f(3).id, fieldName: f(3).name, crop: f(3).crop, ndvi: f(3).ndvi,
    op: 'Опрыскиватель · на стоянке', status: 'на стоянке',
    speed: 0, targetSpeed: 8, ha: 0, fuelLPerHa: 0, fuelNorm: 8.0,
    overlapPct: 0, missPct: 0, start: '—', durationH: 0, points: [],
  },
]

export type TmAlert = {
  id: string
  machineId: string
  machine: string
  kind: AlertKind
  severity: 'risk' | 'warn'
  title: string
  detail: string
  action: string
}

// Алерты выводятся из телеметрии детерминированно (control tower).
export const ALERTS: TmAlert[] = [
  {
    id: 'a1', machineId: 'm1', machine: MACHINES[0].name, kind: 'скорость', severity: 'risk',
    title: 'Превышение скорости при опрыскивании',
    detail: `${MACHINES[0].speed} км/ч при норме ≤ ${MACHINES[0].targetSpeed} км/ч — риск сноса и неравномерного покрытия.`,
    action: 'Снизить скорость / перепроверить норму',
  },
  {
    id: 'a2', machineId: 'm1', machine: MACHINES[0].name, kind: 'перекрытие', severity: 'warn',
    title: 'Перекрытие проходов 12%',
    detail: 'Двойная обработка по краям — перерасход СЗР ~0,9 л и риск фитотоксичности.',
    action: 'Включить секционный контроль (GPS-отсечки)',
  },
  {
    id: 'a3', machineId: 'm3', machine: MACHINES[2].name, kind: 'ГСМ', severity: 'risk',
    title: 'Аномалия расхода ГСМ',
    detail: `${MACHINES[2].fuelLPerHa} л/га против нормы ${MACHINES[2].fuelNorm} л/га + простой 38 мин — возможен слив топлива.`,
    action: 'Проверить датчик уровня и маршрут',
  },
  {
    id: 'a4', machineId: 'm2', machine: MACHINES[1].name, kind: 'геозона', severity: 'warn',
    title: 'Выход за контур поля',
    detail: '2 прохода вышли за кадастровую границу на 14 м — риск обработки чужого участка.',
    action: 'Сверить с кадастром',
  },
]

// ── Антифрод-контур: точные га (приписка) + ГСМ (слив) + ЗП по факту ──
// Главный денежный аргумент в недоверчивом сегменте: подсчёт га по GPS,
// контроль перерасхода/слива ГСМ по датчику, начисление ЗП по факту.
export const PAY_RATE = 250    // ₽/га (сдельная ставка механизатора)
export const FUEL_PRICE = 62   // ₽/л
export type AntifraudRow = {
  machine: string; operator: string; op: string
  haFact: number; haReported: number; pripiska: number
  overFuelL: number; drain: boolean; drainRub: number
  pripiskaRub: number; payAccrued: number; payCorrect: number
  flag: 'слив' | 'приписка' | 'норма'
}
export const ANTIFRAUD = (() => {
  const items: AntifraudRow[] = MACHINES.filter((m) => m.ha > 0).map((m) => {
    const haFact = m.ha
    const haReported = m.haReported ?? m.ha
    const pripiska = +(haReported - haFact).toFixed(1)
    const drain = m.fuelLPerHa > m.fuelNorm * 1.2 // слив/перерасход сверх 20% от нормы
    const overFuelL = drain ? Math.round((m.fuelLPerHa - m.fuelNorm) * haFact) : 0
    const drainRub = Math.round(overFuelL * FUEL_PRICE)
    const pripiskaRub = Math.round(Math.max(0, pripiska) * PAY_RATE)
    return {
      machine: m.name, operator: m.operator, op: m.op, haFact, haReported, pripiska,
      overFuelL, drain, drainRub, pripiskaRub,
      payAccrued: Math.round(haReported * PAY_RATE), payCorrect: Math.round(haFact * PAY_RATE),
      flag: drain ? 'слив' : pripiska > 0 ? 'приписка' : 'норма',
    }
  })
  return {
    items,
    drainRub: items.reduce((s, a) => s + a.drainRub, 0),
    pripiskaRub: items.reduce((s, a) => s + a.pripiskaRub, 0),
    total: items.reduce((s, a) => s + a.drainRub + a.pripiskaRub, 0),
    flagged: items.filter((a) => a.flag !== 'норма').length,
  }
})()

// ── ИИ-контроль качества: сшивка GPS × NDVI × Погода ──
// Единственный продукт, где три слоя данных встречаются в одном экране.
export type QualityInsight = {
  machine: string
  field: string
  ndvi: number
  windMs: number
  tempC: number
  text: string
  verdict: 'risk' | 'warn'
}

export const QUALITY: QualityInsight = (() => {
  const m = MACHINES[0]
  const windMs = 7
  const tempC = Math.round(24 + ANOMALY.tempC) // +аномалия к норме
  return {
    machine: m.name,
    field: m.fieldName,
    ndvi: m.ndvi,
    windMs,
    tempC,
    verdict: 'risk',
    text: `Опрыскивание поля ${m.fieldName} (NDVI ${m.ndvi.toFixed(2)}) шло на ${m.speed} км/ч при ветре ${windMs} м/с и +${tempC} °C. Скорость выше нормы (${m.targetSpeed} км/ч), перекрытие ${m.overlapPct}% — высокий риск сноса препарата и недобора эффекта. Рекомендую перепроверить краевые проходы по NDVI через 5–7 дней и при необходимости провести краевую доработку.`,
  }
})()

export const FLEET_KPI = {
  inField: MACHINES.filter((m) => m.status === 'в работе').length,
  haToday: MACHINES.reduce((s, m) => s + m.ha, 0),
  avgFuel: +(MACHINES.filter((m) => m.fuelLPerHa > 0).reduce((s, m) => s + m.fuelLPerHa, 0) / MACHINES.filter((m) => m.fuelLPerHa > 0).length).toFixed(1),
  alerts: ALERTS.length,
}
