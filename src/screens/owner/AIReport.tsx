import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-line rounded-2xl ${className}`}>{children}</div>
}
function Kpi({ v, l, accent }: { v: ReactNode; l: string; accent?: boolean }) {
  return <Card className="p-4"><div className={`text-[26px] font-extrabold leading-none ${accent ? 'text-brand' : 'text-ink'}`}>{v}</div><div className="text-xs text-muted mt-1.5">{l}</div></Card>
}

const MONTHS = [['апр', 60], ['май', 72], ['июн', 78], ['июл', 81], ['авг', 85]] as const
const TWIN = [['Контуры полей', 100], ['NDVI-история', 92], ['Датчики почвы', 64], ['Техкарты культур', 88]] as const

export function OwnerAIReport() {
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">ИИ-агроном · отчёт о работе</h1>
        <p className="text-sm text-muted mt-0.5">Сколько рекомендаций дано, что выполнено, прогресс по цифровому двойнику</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi v="47" l="рекомендаций за сезон" />
        <Kpi v="38" l="отмечено выполненными" accent />
        <Kpi v="81%" l="выполнение рекомендаций" />
        <Kpi v="92%" l="полей оцифровано" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-bold text-ink mb-3">Выполнение рекомендаций по месяцам</div>
          <div className="h-44 flex items-end gap-3">
            {MONTHS.map(([m, h]) => (
              <div key={m} className="flex-1 flex flex-col items-center"><div className="w-full rounded-t-md bg-ok" style={{ height: `${(h as number) * 1.6}px` }} /><div className="text-[10px] text-center mt-1 text-muted">{m}</div></div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-bold text-ink mb-3">Прогресс цифрового двойника</div>
          <div className="space-y-3">
            {TWIN.map(([name, pct]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-ink">{name}</span><span className="font-bold text-ink">{pct}%</span></div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden"><div className="h-full bg-ok rounded-full" style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4 bg-brand-soft/40 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0"><Sparkles size={18} /></span>
        <div className="text-sm text-ink"><b>Вывод ИИ-агронома:</b> 81% рекомендаций выполнено вовремя — это удержало ≈×2.4 ROI защиты. Недовыполнение по ХБ07 (заразиха) стоило ≈0.4 т/га. Подключение датчиков почвы на 36% полей закроет слепую зону по влаге.</div>
      </Card>
    </div>
  )
}
