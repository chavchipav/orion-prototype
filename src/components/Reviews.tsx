import { useState } from 'react'
import { reviewsFor, ratingFor, type ReviewKind } from '../reviewsData'
import { Star, ThumbsUp, BadgeCheck, ChevronDown } from 'lucide-react'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'text-[#f5a623]' : 'text-line'} fill={i <= Math.round(value) ? '#f5a623' : 'none'} />
      ))}
    </span>
  )
}

// компактный бейдж рейтинга для строк результата
export function RatingBadge({ id, kind }: { id: string; kind: ReviewKind }) {
  const { avg, count } = ratingFor(id, kind)
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Star size={13} className="text-[#f5a623]" fill="#f5a623" /><b className="text-ink">{avg}</b> · {count} отзыв{count % 10 === 1 && count % 100 !== 11 ? '' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'а' : 'ов'}
    </span>
  )
}

// полный блок отзывов для паспорта
export function Reviews({ id, kind }: { id: string; kind: ReviewKind }) {
  const reviews = reviewsFor(id, kind)
  const { avg, count, dist } = ratingFor(id, kind)
  const [all, setAll] = useState(false)
  const [voted, setVoted] = useState<Record<string, boolean>>({})
  const shown = all ? reviews : reviews.slice(0, 3)

  return (
    <div>
      <div className="text-sm font-semibold text-ink mb-2">Отзывы фермеров <span className="text-muted font-normal">· {count}</span></div>
      <div className="flex items-center gap-5 mb-3">
        <div className="text-center shrink-0">
          <div className="text-3xl font-extrabold text-ink leading-none">{avg}</div>
          <Stars value={avg} />
          <div className="text-[11px] text-muted mt-0.5">{count} отзывов</div>
        </div>
        <div className="flex-1 space-y-1">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted">{d.star}</span><Star size={10} className="text-[#f5a623]" fill="#f5a623" />
              <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-[#f5a623] rounded-full" style={{ width: `${count ? (d.n / count) * 100 : 0}%` }} /></div>
              <span className="w-4 text-right text-muted">{d.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {shown.map((r) => (
          <div key={r.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-canvas grid place-items-center text-xs font-bold text-muted">{r.farmer.slice(0, 1)}</div>
                <div>
                  <div className="text-sm font-semibold text-ink flex items-center gap-1.5">{r.farm}{r.verified && <BadgeCheck size={13} className="text-ok" />}</div>
                  <div className="text-[11px] text-muted">{r.region} · {r.crop} · {r.date}</div>
                </div>
              </div>
              <Stars value={r.rating} size={12} />
            </div>
            <div className="text-sm text-ink">{r.text}</div>
            <div className="flex items-center gap-3 mt-1.5">
              {r.metric && <span className="text-[11px] font-semibold text-ok bg-ok-soft px-2 py-0.5 rounded-full">{r.metric}</span>}
              {r.verified && <span className="text-[11px] text-muted">проверенная покупка</span>}
              <button onClick={() => setVoted((v) => ({ ...v, [r.id]: !v[r.id] }))} className={`ml-auto inline-flex items-center gap-1 text-[11px] ${voted[r.id] ? 'text-brand font-semibold' : 'text-muted hover:text-ink'}`}>
                <ThumbsUp size={12} />полезно · {r.helpful + (voted[r.id] ? 1 : 0)}
              </button>
            </div>
          </div>
        ))}
      </div>
      {reviews.length > 3 && !all && <button onClick={() => setAll(true)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand">Показать все {count} <ChevronDown size={15} /></button>}
      <button className="mt-3 w-full border border-line rounded-xl py-2 text-sm font-semibold text-ink hover:bg-canvas">Оставить отзыв</button>
    </div>
  )
}
