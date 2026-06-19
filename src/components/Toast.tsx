import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { Check, Info, AlertTriangle, X } from 'lucide-react'

type Tone = 'ok' | 'info' | 'warn'
type ToastItem = { id: number; text: string; tone: Tone }
type Ctx = { toast: (text: string, tone?: Tone) => void }

const ToastCtx = createContext<Ctx | null>(null)

// Единый механизм всплывашек — заменяет разрозненные inline-флэши по экранам.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const remove = (id: number) => setItems((s) => s.filter((t) => t.id !== id))
  const toast = (text: string, tone: Tone = 'ok') => {
    const id = ++idRef.current
    setItems((s) => [...s, { id, text, tone }])
    setTimeout(() => remove(id), 3800)
  }
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="no-print fixed top-4 right-4 z-[1900] flex flex-col gap-2 w-[320px] max-w-[90vw] pointer-events-none">
        {items.map((t) => {
          const c = t.tone === 'warn' ? '#e0900a' : t.tone === 'info' ? '#2563eb' : '#2da84f'
          const I = t.tone === 'warn' ? AlertTriangle : t.tone === 'info' ? Info : Check
          return (
            <div key={t.id} className="pointer-events-auto bg-white text-ink rounded-xl shadow-2xl border border-line px-3.5 py-3 flex items-start gap-2.5 animate-[toastIn_.22s_ease-out]">
              <span className="w-6 h-6 rounded-lg grid place-items-center shrink-0 mt-0.5" style={{ background: c + '1f', color: c }}><I size={14} /></span>
              <div className="text-sm text-ink leading-snug flex-1">{t.text}</div>
              <button onClick={() => remove(t.id)} className="text-muted hover:text-ink shrink-0"><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

// безопасен вне провайдера (no-op) — экраны могут вызывать без обвязки
export function useToast() { return useContext(ToastCtx)?.toast ?? (() => {}) }
