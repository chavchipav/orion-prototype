import type { ReactNode } from 'react'
import { useApp } from '../store'
import { Lock, BarChart3, BadgeCheck } from 'lucide-react'

function Kpi({ v, l }: { v: ReactNode; l: string }) {
  return <div className="rounded-xl bg-canvas p-3"><div className="text-xl font-extrabold text-ink leading-none">{v}</div><div className="text-[11px] text-muted mt-1.5">{l}</div></div>
}

// Озон-стиль: аналитика потерь под замком до тарифа «Про»
export function Upsell() {
  const { tier, setTier } = useApp()
  const unlocked = tier !== 'free'

  const kpis = (
    <div className="grid grid-cols-3 gap-3">
      <Kpi v={<span className="text-risk">−1 350 т</span>} l="недобор vs план" />
      <Kpi v="8.4 млн ₽" l="упущенная выручка" />
      <Kpi v="ХБ07 · ХБ09" l="главные очаги потерь" />
    </div>
  )

  return (
    <div className={`relative rounded-2xl border border-brand/30 bg-white overflow-hidden ${!unlocked ? 'min-h-[232px]' : ''}`}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-brand-soft text-brand grid place-items-center"><BarChart3 size={15} /></span>
          <div className="font-bold text-ink">Аналитика потерь по полям</div>
          {unlocked && <span className="ml-auto text-xs font-semibold text-ok inline-flex items-center gap-1"><BadgeCheck size={13} />«Про» подключён</span>}
        </div>
        <div className={unlocked ? '' : 'blur-[5px] select-none pointer-events-none'}>{kpis}</div>
        {unlocked && <div className="text-xs text-muted mt-3">Разбег план-факт по каждому полю, корневые причины потерь и ROI решений — теперь доступны.</div>}
      </div>
      {!unlocked && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-white via-white/85 to-white/40">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center mx-auto mb-2"><Lock size={22} /></div>
            <div className="font-extrabold text-lg text-ink">Вы теряете до <span className="text-brand">10% урожая</span> без этой аналитики</div>
            <p className="text-sm text-muted mt-1 mb-3">Разбег план-факт по каждому полю, корневые причины потерь и ROI решений.</p>
            <button onClick={() => setTier('pro')} className="bg-brand text-white font-bold px-5 py-2.5 rounded-xl hover:brightness-110">Подключить тариф «Про»</button>
          </div>
        </div>
      )}
    </div>
  )
}
