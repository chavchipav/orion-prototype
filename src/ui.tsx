import type { ReactNode } from 'react'
import {
  Home, Map, Sparkles, FlaskConical, Truck, Landmark, Gauge, LayoutGrid,
  Wallet, Radar, ShoppingCart, ShieldCheck, Lock, Leaf, Droplets, Wind, Sun,
  ChevronRight, Camera, Mic, Check, AlertTriangle, TrendingUp, TrendingDown,
  Bell, Search, MapPin, Satellite, Bot, CloudSun, CircleDollarSign, Users,
  type LucideIcon,
} from 'lucide-react'
import type { Status } from './data'

const ICONS: Record<string, LucideIcon> = {
  Home, Map, Sparkles, FlaskConical, Truck, Landmark, Gauge, LayoutGrid, Wallet,
  Radar, ShoppingCart, ShieldCheck, Lock, Leaf, Droplets, Wind, Sun, ChevronRight,
  Camera, Mic, Check, AlertTriangle, TrendingUp, TrendingDown, Bell, Search, MapPin,
  Satellite, Bot, CloudSun, CircleDollarSign, Users,
}

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const C = ICONS[name] ?? Leaf
  return <C size={size} className={className} />
}

export function Card({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white border border-line ${pad ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-ink tracking-tight">{children}</h2>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
    </div>
  )
}

export function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-extrabold tracking-tight ${accent ? 'text-brand' : 'text-ink'}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}

const statusMap: Record<Status, { bg: string; text: string; label: string }> = {
  ok: { bg: 'bg-ok-soft', text: 'text-ok', label: 'Норма' },
  warn: { bg: 'bg-warn-soft', text: 'text-warn', label: 'Внимание' },
  risk: { bg: 'bg-risk-soft', text: 'text-risk', label: 'Риск' },
}

export function StatusChip({ s }: { s: Status }) {
  const m = statusMap[s]
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>{m.label}</span>
}

export function statusColor(s: Status) {
  return s === 'ok' ? '#2da84f' : s === 'warn' ? '#e0900a' : '#e5302a'
}

export function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'brand' | 'sky' | 'ok' }) {
  const tones: Record<string, string> = {
    gray: 'bg-canvas text-muted',
    brand: 'bg-brand-soft text-brand',
    sky: 'bg-sky-soft text-sky',
    ok: 'bg-ok-soft text-ok',
  }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Btn({ children, onClick, variant = 'primary', size = 'md' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'soft'; size?: 'md' | 'sm'
}) {
  const v = {
    primary: 'bg-brand text-white hover:opacity-90',
    ghost: 'bg-transparent text-ink border border-line hover:bg-canvas',
    soft: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
  }[variant]
  const s = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
  return <button onClick={onClick} className={`rounded-xl font-semibold transition ${v} ${s}`}>{children}</button>
}
