import { useEffect, useRef, useState } from 'react'

// Анимированный счётчик: число «набегает» от 0 к значению при появлении (G-делайт).
// value — целевое число; prefix/suffix — обрамление; decimals — знаков после запятой.
export function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 900 }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number
}) {
  const [n, setN] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    let start: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const tick = (ts: number) => {
      if (start === null) start = ts
      const k = Math.min(1, (ts - start) / duration)
      setN(value * ease(k))
      if (k < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration])
  const text = n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <>{prefix}{text}{suffix}</>
}

// Лёгкое конфетти: на короткое время сыплем цветные частицы из центра вверху.
const CONFETTI_COLORS = ['#fc3f1d', '#2da84f', '#2563eb', '#e0900a', '#9333ea']
export function fireConfetti() {
  if (typeof document === 'undefined') return
  const wrap = document.createElement('div')
  wrap.className = 'no-print'
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2000;pointer-events:none;overflow:hidden;'
  document.body.appendChild(wrap)
  const N = 80
  for (let i = 0; i < N; i++) {
    const p = document.createElement('div')
    const c = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    const left = 30 + Math.random() * 40
    const dx = (Math.random() - 0.5) * 240
    const delay = Math.random() * 120
    const dur = 1400 + Math.random() * 900
    const size = 6 + Math.random() * 6
    const rot = Math.random() * 360
    p.style.cssText = `position:absolute;top:14%;left:${left}%;width:${size}px;height:${size * 1.6}px;`
      + `background:${c};border-radius:2px;opacity:0;transform:rotate(${rot}deg);`
      + `animation:confettiFall ${dur}ms ${delay}ms cubic-bezier(.2,.6,.4,1) forwards;`
    p.style.setProperty('--dx', `${dx}px`)
    wrap.appendChild(p)
  }
  setTimeout(() => wrap.remove(), 2600)
}
