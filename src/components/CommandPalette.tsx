import { useEffect, useMemo, useRef, useState } from 'react'
import type { ScreenKey } from '../store'
import { Search, CornerDownLeft } from 'lucide-react'

export type CmdItem = { key: ScreenKey; label: string; group?: string }

// ⌘K / Ctrl+K — быстрый переход по экранам кабинета (находимость)
export function CommandPalette({ open, onClose, items, onPick }: {
  open: boolean
  onClose: () => void
  items: CmdItem[]
  onPick: (k: ScreenKey) => void
}) {
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')
  const filtered = useMemo(() => {
    const t = norm(q.trim())
    if (!t) return items
    return items.filter((i) => norm(i.label).includes(t) || norm(i.group || '').includes(t))
  }, [q, items])

  useEffect(() => { if (open) { setQ(''); setHi(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { setHi(0) }, [q])

  if (!open) return null
  const pick = (k?: ScreenKey) => { if (k) { onPick(k); onClose() } }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(filtered.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(filtered[hi]?.key) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-[1700] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white text-ink rounded-2xl shadow-2xl border border-line overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 border-b border-line">
          <Search size={17} className="text-muted shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Куда перейти? Экран, раздел…" className="flex-1 py-3.5 text-sm outline-none bg-transparent" />
          <kbd className="text-[10px] text-muted border border-line rounded px-1.5 py-0.5 shrink-0">esc</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto scroll-thin py-1.5">
          {filtered.length ? filtered.map((i, idx) => (
            <button key={i.key} onMouseEnter={() => setHi(idx)} onClick={() => pick(i.key)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 ${idx === hi ? 'bg-brand-soft/50' : 'hover:bg-canvas'}`}>
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm text-ink truncate">{i.label}</span>
                {i.group && <span className="text-[11px] text-muted shrink-0">· {i.group}</span>}
              </span>
              {idx === hi && <CornerDownLeft size={13} className="text-brand shrink-0" />}
            </button>
          )) : (
            <div className="px-4 py-8 text-center text-sm text-muted">Ничего не нашлось по «{q}»</div>
          )}
        </div>
      </div>
    </div>
  )
}
