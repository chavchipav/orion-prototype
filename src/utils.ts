// Детерминированный мок-«рандом», общий для всех data-файлов.
// Раньше эти две функции были скопированы в ~13 файлов — теперь один источник.
// Алгоритмы байт-в-байт прежние, поэтому сгенерированные данные не меняются.

// seeded PRNG mulberry32 → функция-генератор [0,1)
export function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a хеш строки → uint32 (удобно как seed для mulberry32)
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
