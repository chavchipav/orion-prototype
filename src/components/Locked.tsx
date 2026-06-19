import type { ReactNode } from 'react'
import { useApp } from '../store'
import { TIERS, type Tier } from '../data'
import { Icon, Btn } from '../ui'

// Оборачивает экран: если тариф ниже нужного — показывает превью под замком + CTA
export function Locked({ tier, children }: { tier: Tier; children: ReactNode }) {
  const { isLocked, setTier } = useApp()
  if (!isLocked(tier)) return <>{children}</>
  const t = TIERS.find((x) => x.key === tier)!

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[3px] opacity-60">{children}</div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="rounded-2xl bg-white border border-line shadow-xl p-6 max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-soft text-brand grid place-items-center mx-auto mb-3">
            <Icon name="Lock" size={22} />
          </div>
          <div className="font-bold text-ink text-lg">Модуль в тарифе «{t.label}»</div>
          <p className="text-sm text-muted mt-1">{t.note}</p>
          <div className="text-2xl font-extrabold text-brand mt-3">{t.pricePerHa} ₽<span className="text-sm text-muted font-medium">/га · сезон</span></div>
          <div className="mt-4 flex gap-2 justify-center">
            <Btn onClick={() => setTier(tier)}>Открыть модуль</Btn>
          </div>
          <p className="text-[11px] text-muted mt-3">Цены — демонстрационные (плейсхолдеры)</p>
        </div>
      </div>
    </div>
  )
}
