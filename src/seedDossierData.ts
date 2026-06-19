// ─────────────────────────────────────────────────────────────
// «Досье гибрида» — данные для CustDev с Надеждой (Genesis).
// Спутниковый слой: межхозяйственный спутниковый слой по полям РФ →
// бенчмарк гибрида против медианы/топ-25% района по культуре.
// Плюс экономика для клиента (прибавка − премия за семена → выгода ₽/га).
// Все цифры — демо.
// ─────────────────────────────────────────────────────────────

// Региональный бенчмарк урожайности подсолнечника по зонам — «спутниковый слой».
// n — число полей в спутниковом слое (масштаб актива, неконкурируемый).
export type RegionStat = { median: number; p75: number; n: number }
export const REGION_SUNFLOWER: Record<string, RegionStat> = {
  'Юг (богара)': { median: 2.4, p75: 2.9, n: 1840 },
  'ЦЧО': { median: 2.8, p75: 3.2, n: 1120 },
  'Поволжье': { median: 2.2, p75: 2.7, n: 760 },
  'Казахстан': { median: 1.9, p75: 2.4, n: 540 },
}

// Цена товарного подсолнечника, ₽/т (та же, что в agronomSeason.PRICE).
export const SUNFLOWER_PRICE = 35000
// Цена «коммодити»-семян конкурента, ₽/п.е. (для расчёта премии Genesis).
export const RIVAL_PU_PRICE = 12000
// Норма высева, п.е./га.
export const SEED_PU_PER_HA = 0.2

export type ClientEconomics = {
  zone: string
  hybridYield: number   // т/га (proven гибрида в зоне)
  median: number        // т/га медиана района
  gainT: number         // прибавка к медиане, т/га
  revenueGain: number   // прибавка × цена, ₽/га
  premium: number       // премия Genesis за семена vs конкурент, ₽/га
  benefit: number       // выгода клиента, ₽/га
  payback: number       // во сколько раз прибавка покрывает премию
}

// Экономика для клиента: стоит ли платить премию за гибрид Genesis.
export function clientEconomics(zone: string, hybridYield: number, hybridPuPrice: number): ClientEconomics {
  const median = (REGION_SUNFLOWER[zone] ?? REGION_SUNFLOWER['Юг (богара)']).median
  const gainT = +(hybridYield - median).toFixed(2)
  const revenueGain = Math.round(gainT * SUNFLOWER_PRICE)
  const premium = Math.round(SEED_PU_PER_HA * (hybridPuPrice - RIVAL_PU_PRICE))
  const benefit = revenueGain - premium
  const payback = premium > 0 ? +(revenueGain / premium).toFixed(1) : 0
  return { zone, hybridYield, median, gainT, revenueGain, premium, benefit, payback }
}

export function rub(n: number): string {
  return (n >= 0 ? '' : '−') + Math.abs(Math.round(n)).toLocaleString('ru-RU') + ' ₽'
}
