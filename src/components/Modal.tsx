import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-white">
          <div className="font-bold text-ink text-lg">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-canvas grid place-items-center text-muted text-lg">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-muted mb-1">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full px-3 py-2.5 rounded-xl bg-canvas text-sm outline-none border border-transparent focus:border-brand/40" />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full px-3 py-2.5 rounded-xl bg-canvas text-sm outline-none border border-transparent focus:border-brand/40" />
}
