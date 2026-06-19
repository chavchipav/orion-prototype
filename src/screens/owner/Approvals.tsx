import { useApprovals, type Approval } from '../../approvalStore'
import { Check, X } from 'lucide-react'

const toneColor = (t: Approval['tone']) => t === 'risk' ? '#e5302a' : t === 'warn' ? '#e0900a' : '#2da84f'

export function OwnerApprovals() {
  const { approvals, decide } = useApprovals()
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Согласования</h1>
        <p className="text-sm text-muted mt-0.5">Работы и закупки, ждущие вашего решения как бюджетодержателя</p>
      </div>
      <div className="bg-white border border-line rounded-2xl p-2">
        {approvals.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-3.5 border-b border-line last:border-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: toneColor(a.tone) }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink truncate">{a.title}</div>
              <div className="text-xs text-muted">{a.requester} · {a.date}{a.field ? ` · ${a.field}` : ''}</div>
            </div>
            <span className="font-bold text-sm text-ink shrink-0">{a.amount}</span>
            {a.status === 'ждёт' ? (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => decide(a.id, true)} className="bg-ok text-white text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center gap-1"><Check size={13} />Согласовать</button>
                <button onClick={() => decide(a.id, false)} className="border border-line text-muted text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center gap-1"><X size={13} />Отклонить</button>
              </div>
            ) : (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${a.status === 'согласовано' ? 'bg-ok-soft text-ok' : 'bg-risk-soft text-risk'}`}>{a.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
