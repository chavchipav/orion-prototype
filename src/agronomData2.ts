// Доп. доменные данные АгроМон-grade кабинета (техкарты, работы, погода, аналитика, кадастр)
import { AG_FIELDS, FARM, type LatLng, type Crop } from './agronomData'

// ── GPS-мониторинг техники: серпантинные проходы, ОБРЕЗАННЫЕ по контуру поля ──
// (горизонтальные сканлайны пересекаем с рёбрами кольца → проход остаётся внутри
//  реального полигона, а не вылезает за bbox, как было на прямоугольной сетке).
function serpentine(ring: LatLng[], rows: number): LatLng[] {
  let minLat = 90, maxLat = -90
  for (const [la] of ring) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la) }
  const inset = 0.0006
  const pts: LatLng[] = []
  for (let r = 0; r < rows; r++) {
    const la = maxLat - (r + 0.5) * (maxLat - minLat) / rows
    const xs: number[] = []
    for (let i = 0; i < ring.length; i++) {
      const [la1, ln1] = ring[i], [la2, ln2] = ring[(i + 1) % ring.length]
      if ((la1 <= la && la2 > la) || (la2 <= la && la1 > la)) {
        const t = (la - la1) / (la2 - la1)
        xs.push(ln1 + t * (ln2 - ln1))
      }
    }
    if (xs.length < 2) continue
    xs.sort((a, b) => a - b)
    const lo = xs[0] + inset, hi = xs[xs.length - 1] - inset
    if (hi <= lo) continue
    if (r % 2 === 0) { pts.push([la, lo]); pts.push([la, hi]) }
    else { pts.push([la, hi]); pts.push([la, lo]) }
  }
  return pts
}
export type GpsTrack = { machine: string; operator: string; color: string; speed: number; ha: number; points: LatLng[] }
export const GPS_TRACKS: GpsTrack[] = [
  { machine: 'Кировец К-744', operator: 'Иванов А.', color: '#fc3f1d', speed: 9.2, ha: 112, points: serpentine(AG_FIELDS[0].ring, 7) },
  { machine: 'МТЗ-1221', operator: 'Петров С.', color: '#2b6def', speed: 7.8, ha: 78, points: serpentine(AG_FIELDS[6].ring, 6) },
  { machine: 'John Deere 8R', operator: 'Сидоров К.', color: '#e0a92b', speed: 11.4, ha: 146, points: serpentine(AG_FIELDS[11].ring, 8) },
]

// ── СЗР / препараты ──
export const PREPARATIONS = [
  { name: 'Велосити Супер', kind: 'Гербицид', norm: 1.0, unit: 'л/га' },
  { name: 'Децис Эксперт', kind: 'Инсектицид', norm: 0.125, unit: 'л/га' },
  { name: 'Инпут, КЭ', kind: 'Фунгицид', norm: 0.6, unit: 'л/га' },
  { name: 'Прозаро', kind: 'Фунгицид', norm: 0.8, unit: 'л/га' },
  { name: 'Карбамид', kind: 'Удобрение', norm: 150, unit: 'кг/га' },
  { name: 'Аммофос', kind: 'Удобрение', norm: 100, unit: 'кг/га' },
]

export type TechOp = { block: string; name: string; status: 'План' | 'Факт'; products?: { name: string; norm: number; unit: string }[]; phase?: string }
export type TechCard = { id: string; name: string; crop: Crop; year: number; ops: TechOp[] }
export const TECHCARDS: TechCard[] = [
  {
    id: 't1', name: 'Озимая пшеница_2026', crop: 'Озимая пшеница', year: 2026, ops: [
      { block: 'Почвообработка', name: 'Дискование', status: 'Факт' },
      { block: 'Сев', name: 'Посев', status: 'Факт' },
      { block: 'Защита растений', name: 'Опрыскивание (гербицид)', status: 'Факт', phase: 'Кущение', products: [{ name: 'Велосити Супер', norm: 1, unit: 'л/га' }] },
      { block: 'Защита растений', name: 'Опрыскивание (фунгицид)', status: 'План', phase: 'Колошение', products: [{ name: 'Инпут, КЭ', norm: 0.6, unit: 'л/га' }, { name: 'Децис Эксперт', norm: 0.125, unit: 'л/га' }] },
      { block: 'Питание', name: 'Подкормка', status: 'План', products: [{ name: 'Карбамид', norm: 150, unit: 'кг/га' }] },
      { block: 'Уборка', name: 'Уборка', status: 'План' },
    ],
  },
  { id: 't2', name: 'Подсолнечник_2026', crop: 'Подсолнечник', year: 2026, ops: [{ block: 'Сев', name: 'Посев', status: 'Факт' }, { block: 'Защита растений', name: 'Гербицидная обработка', status: 'Факт', products: [{ name: 'Велосити Супер', norm: 1, unit: 'л/га' }] }, { block: 'Уборка', name: 'Уборка', status: 'План' }] },
  { id: 't3', name: 'Кукуруза_2026', crop: 'Кукуруза', year: 2026, ops: [{ block: 'Сев', name: 'Посев', status: 'Факт' }, { block: 'Питание', name: 'Подкормка', status: 'План', products: [{ name: 'Аммофос', norm: 100, unit: 'кг/га' }] }] },
  { id: 't4', name: 'Соя_2026', crop: 'Соя', year: 2026, ops: [{ block: 'Сев', name: 'Посев', status: 'Факт' }, { block: 'Защита растений', name: 'Фунгицид', status: 'План', products: [{ name: 'Прозаро', norm: 0.8, unit: 'л/га' }] }] },
]

// ── Работы / Контроль работ ──
export type Work = { id: string; field: string; op: string; status: 'План' | 'В работе' | 'Факт'; date: string; tech: string; operator: string; ha: number }
export const WORKS: Work[] = AG_FIELDS.slice(0, 11).map((f, i) => ({
  id: 'w' + i, field: f.name, op: ['Опрыскивание', 'Подкормка', 'Дискование', 'Посев'][i % 4],
  status: (['Факт', 'В работе', 'План'] as const)[i % 3], date: `${10 + (i % 12)}.07`,
  tech: ['Кировец К-744', 'МТЗ-1221', 'John Deere 8R'][i % 3], operator: ['Иванов А.', 'Петров С.', 'Сидоров К.'][i % 3], ha: f.areaHa,
}))

// ── Погода ──
export const WEATHER = {
  today: { t: 29, wind: 4, hum: 38, rain: 0, soil: 18 },
  forecast: [
    { d: 'Чт', t: 31, icon: '☀', rain: 0 }, { d: 'Пт', t: 33, icon: '☀', rain: 0 }, { d: 'Сб', t: 27, icon: '⛅', rain: 2 },
    { d: 'Вс', t: 22, icon: '🌧', rain: 12 }, { d: 'Пн', t: 24, icon: '⛅', rain: 1 }, { d: 'Вт', t: 26, icon: '☀', rain: 0 }, { d: 'Ср', t: 28, icon: '☀', rain: 0 },
  ],
  history: ['01', '08', '15', '22', '29'].map((d, i) => ({ d: d + '.07', t: [27, 30, 33, 34, 28][i], rain: [0, 0, 0, 0, 12][i] })),
}

// ── Аналитика урожайности по культуре × сорт ──
export const YIELD_BY_SORT = [
  { crop: 'Озимая пшеница', sort: 'Гром', yield: 5.8, area: 410 },
  { crop: 'Озимая пшеница', sort: 'Алексеич', yield: 6.2, area: 330 },
  { crop: 'Подсолнечник', sort: 'Гелиос-310', yield: 3.1, area: 280 },
  { crop: 'Подсолнечник', sort: 'НК Брио', yield: 2.7, area: 190 },
  { crop: 'Кукуруза', sort: 'ДКС 4014', yield: 8.4, area: 240 },
  { crop: 'Соя', sort: 'Селекта 201', yield: 2.5, area: 210 },
]

// ── Севооборот (последние 4 сезона по полю) ──
const RC: Crop[] = ['Озимая пшеница', 'Подсолнечник', 'Кукуруза', 'Соя', 'Яровой ячмень', 'Горох', 'Пар']
export const ROTATION = AG_FIELDS.slice(0, 12).map((f, fi) => ({
  field: f.name,
  years: [2023, 2024, 2025, 2026].map((y, i) => ({ year: y, crop: i === 3 ? f.crop : RC[(fi + i) % RC.length] })),
}))

// ── Кадастровые участки (Росреестр) — КН 1:1 с реальным контуром поля ──
// (раньше парсель был bbox-прямоугольником; теперь — то же кольцо, что и поле,
//  поэтому оверлей Росреестра буквально совпадает с границей пашни).
export type Parcel = { kn: string; areaHa: number; ring: LatLng[]; matchedField?: string }
export const PARCELS: Parcel[] = AG_FIELDS.map((f, i) => ({
  kn: `61:0${2 + (i % 5)}:06${String(10 + i).padStart(4, '0')}:101`,
  areaHa: f.areaHa,
  ring: f.ring,
  matchedField: f.name,
}))

// ── Рекомендации (по проблемам осмотров) ──
export type Recommendation = { id: string; field: string; crop: string; problem: string; text: string; product: string; status: 'Новая' | 'Принята' | 'В техкарте'; agronom: string }
export const RECOMMENDATIONS: Recommendation[] = [
  { id: 'r1', field: 'ХБ04', crop: 'Озимая пшеница', problem: 'Фузариоз колоса', text: 'Фунгицидная обработка в фазу колошения, не затягивать — риск микотоксинов', product: 'Прозаро 0,8 л/га', status: 'Новая', agronom: 'Пётр И.' },
  { id: 'r2', field: 'ХБ07', crop: 'Подсолнечник', problem: 'Заразиха', text: 'Перейти на гибрид Clearfield + гербицид по системе на следующий сезон; в этом — мониторинг очага', product: 'Сапфир-КЛ (сорт)', status: 'Принята', agronom: 'Сергей К.' },
  { id: 'r3', field: 'ХБ01', crop: 'Пар', problem: 'Засуха, NDVI↓', text: 'Влагосберегающая обработка, отложить азотную подкормку до осадков', product: '—', status: 'В техкарте', agronom: 'Пётр И.' },
  { id: 'r4', field: 'ХБ12', crop: 'Кукуруза', problem: 'Луговой мотылёк', text: 'Инсектицидная обработка при превышении ЭПВ; повторный осмотр через 5 дней', product: 'Децис Эксперт 0,125 л/га', status: 'Новая', agronom: 'Сергей К.' },
]

// ── Справочник сортов/гибридов ──
export type SortRef = { crop: string; name: string; maturity: string; note: string }
export const SORTS_REF: SortRef[] = [
  { crop: 'Озимая пшеница', name: 'Гром', maturity: 'среднеранний', note: 'засухоустойчивый, для Юга' },
  { crop: 'Озимая пшеница', name: 'Алексеич', maturity: 'среднеспелый', note: 'высокий потенциал при влаге' },
  { crop: 'Подсолнечник', name: 'Гелиос-310', maturity: 'среднеранний', note: 'устойчив к заразихе расы G' },
  { crop: 'Подсолнечник', name: 'Сапфир-КЛ', maturity: 'среднеранний', note: 'Clearfield, под имидазолиноны' },
  { crop: 'Кукуруза', name: 'ДКС 4014', maturity: 'ФАО 290', note: 'зерновая, засухоустойчивая' },
  { crop: 'Соя', name: 'Селекта 201', maturity: 'раннеспелый', note: 'для ЦЧО и Юга' },
]

// ── Справочник техники ──
export type TechRef = { name: string; kind: string; width: string; note: string }
export const TECH_REF: TechRef[] = [
  { name: 'Кировец К-744', kind: 'Трактор', width: '—', note: 'почвообработка, посев' },
  { name: 'МТЗ-1221', kind: 'Трактор', width: '—', note: 'опрыскивание, подкормка' },
  { name: 'John Deere 8R', kind: 'Трактор', width: '—', note: 'универсал, GPS-автовождение' },
  { name: 'Amazone UX 5200', kind: 'Опрыскиватель', width: '24 м', note: 'СЗР, рабочий раствор 200 л/га' },
  { name: 'Väderstad Rapid', kind: 'Сеялка', width: '6 м', note: 'зерновые' },
  { name: 'Claas Lexion 760', kind: 'Комбайн', width: '9 м', note: 'уборка зерновых' },
]

// ── Клиенты (операции) — для консультанта / мульти-хозяйственный режим ──
export type ClientOp = { id: string; name: string; region: string; ha: number; fields: number; status: 'ok' | 'warn' | 'risk'; role: 'Своё' | 'Консультирую' }
export const AG_CLIENTS: ClientOp[] = [
  { id: 'o1', name: 'Хлеборобное', region: 'Ростовская обл.', ha: FARM.totalHa, fields: FARM.fieldsCount, status: 'warn', role: 'Своё' },
  { id: 'o2', name: 'Агрофирма «Заря»', region: 'Ростовская обл.', ha: 4200, fields: 28, status: 'ok', role: 'Консультирую' },
  { id: 'o3', name: 'КФХ Дон', region: 'Ставропольский кр.', ha: 1850, fields: 14, status: 'risk', role: 'Консультирую' },
  { id: 'o4', name: 'Агрохолдинг «Степь»', region: 'Краснодарский кр.', ha: 12400, fields: 76, status: 'warn', role: 'Консультирую' },
  { id: 'o5', name: 'ООО «Нива»', region: 'Курская обл.', ha: 3300, fields: 22, status: 'ok', role: 'Консультирую' },
]
