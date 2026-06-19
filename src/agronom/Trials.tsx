import { useMemo, useState } from 'react'
import { TRIALS, analyze, plotsOf, type Trial } from '../agronomTrials'
import { FlaskConical, Grid3x3, Check, Lightbulb, BadgeCheck } from 'lucide-react'

// шкала урожайности → зелёный градиент (для делянок)
function yieldColor(v: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (v - min) / Math.max(0.01, max - min)))
  const r = Math.round(220 - 150 * t), g = Math.round(140 + 80 * t), b = Math.round(70 - 20 * t)
  return `rgb(${r},${g},${b})`
}

export function Trials() {
  const [id, setId] = useState(TRIALS[0].id)
  const t = TRIALS.find((x) => x.id === id) as Trial
  const res = useMemo(() => analyze(t), [id])
  const plots = useMemo(() => plotsOf(t), [id])
  const [applied, setApplied] = useState<Record<string, boolean>>({})

  const A = t.factorA.levels, B = t.factorB.levels
  const cell = (a: string, b: string) => {
    const arr = plots.filter((p) => p.aLevel === a && p.bLevel === b).map((p) => p.yield)
    return arr.reduce((s, x) => s + x, 0) / arr.length
  }
  const allMeans = A.flatMap((a) => B.map((b) => cell(a, b)))
  const [mn, mx] = [Math.min(...allMeans), Math.max(...allMeans)]
  const maxA = Math.max(...res.meansA.map((m) => m.mean)), maxB = Math.max(...res.meansB.map((m) => m.mean))

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2"><FlaskConical size={20} className="text-brand" />Опыты · полевые эксперименты</h2>
        <p className="text-sm text-muted mt-1 max-w-2xl">Закрывает «таблицу в Excel и устный вывод»: дизайн опыта → урожай по делянкам → <b>вклад каждого фактора</b> (разложение дисперсии) → решение, что реально двигает урожай.</p>
      </div>

      {/* выбор опыта */}
      <div className="inline-flex gap-1 bg-white border border-line rounded-xl p-1 mb-4">
        {TRIALS.map((x) => (
          <button key={x.id} onClick={() => setId(x.id)} className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${id === x.id ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>{x.crop} · {x.year}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* левая колонка: дизайн + делянки */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-2xl bg-white border border-line p-4">
            <div className="font-bold text-ink">{t.name}</div>
            <div className="text-xs text-muted mt-0.5">{t.crop} · поле {t.field} · {t.reps} повторности · {A.length * B.length * t.reps} делянок × {t.plotAreaHa} га</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs">
              <div><span className="text-muted">Фактор A — {t.factorA.name}:</span> <b className="text-ink">{A.join(' · ')}</b></div>
              <div><span className="text-muted">Фактор B — {t.factorB.name}:</span> <b className="text-ink">{B.join(' · ')}</b></div>
            </div>
          </div>

          {/* грид делянок: средний урожай по ячейке A×B */}
          <div className="rounded-2xl bg-white border border-line p-4">
            <div className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5"><Grid3x3 size={15} className="text-muted" />Урожай по делянкам, т/га (среднее A×B)</div>
            <div className="overflow-x-auto scroll-thin">
              <table className="text-sm border-separate border-spacing-1">
                <thead><tr><th></th>{B.map((b) => <th key={b} className="text-[11px] font-medium text-muted px-2 pb-1">{b}</th>)}<th className="text-[11px] font-medium text-ink px-2">сред.</th></tr></thead>
                <tbody>
                  {A.map((a, ai) => (
                    <tr key={a}>
                      <td className="text-[11px] font-semibold text-ink pr-2 whitespace-nowrap">{a}</td>
                      {B.map((b) => { const v = cell(a, b); return <td key={b} className="text-center text-white text-xs font-bold rounded-md px-2.5 py-1.5" style={{ background: yieldColor(v, mn, mx) }}>{v.toFixed(2)}</td> })}
                      <td className="text-center text-xs font-bold text-ink px-2">{res.meansA[ai].mean.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr><td className="text-[11px] font-semibold text-ink pr-2">сред.</td>{B.map((b, bi) => <td key={b} className="text-center text-xs font-bold text-ink">{res.meansB[bi].mean.toFixed(2)}</td>)}<td className="text-center text-[11px] text-muted">{res.grand.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* средние по уровням */}
          <div className="grid grid-cols-2 gap-4">
            <LevelBars title={t.factorA.name} rows={res.meansA} max={maxA} best={res.bestA} />
            <LevelBars title={t.factorB.name} rows={res.meansB} max={maxB} best={res.bestB} />
          </div>
        </div>

        {/* правая колонка: вклад факторов + решение */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-line p-4">
            <div className="text-sm font-semibold text-ink mb-3">Вклад факторов в урожай</div>
            <div className="space-y-3">
              {res.contributions.map((c, i) => {
                const col = i === 0 ? '#fc3f1d' : i === 1 ? '#2b6def' : i === 2 ? '#e0900a' : '#bcbcc4'
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-ink font-medium">{c.name}</span><span className="font-bold text-ink">{c.pct}%</span></div>
                    <div className="h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: col }} /></div>
                  </div>
                )
              })}
            </div>
            <div className="text-[11px] text-muted mt-3">Двухфакторное разложение дисперсии (доля суммы квадратов) по урожаю делянок.</div>
          </div>

          <div className="rounded-2xl bg-brand-soft/50 border border-brand/20 p-4">
            <div className="text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5"><Lightbulb size={15} className="text-brand" />Решение</div>
            <div className="text-sm text-ink leading-relaxed">{res.decision}</div>
            {applied[t.id]
              ? <div className="mt-3 text-xs font-semibold text-ok flex items-center gap-1.5"><BadgeCheck size={14} />Внесено в план следующего сезона + «проверено полем»</div>
              : <button onClick={() => setApplied((s) => ({ ...s, [t.id]: true }))} className="mt-3 w-full flex items-center justify-center gap-1.5 bg-brand text-white rounded-xl py-2 text-sm font-semibold"><Check size={14} />Применить в техкарту / план</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function LevelBars({ title, rows, max, best }: { title: string; rows: { level: string; mean: number }[]; max: number; best: string }) {
  const min = Math.min(...rows.map((r) => r.mean))
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <div className="text-sm font-semibold text-ink mb-2">{title} · средний урожай</div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.level}>
            <div className="flex items-center justify-between text-xs mb-0.5"><span className={`${r.level === best ? 'font-bold text-ink' : 'text-muted'}`}>{r.level}{r.level === best && ' ★'}</span><span className="font-semibold text-ink">{r.mean.toFixed(2)}</span></div>
            <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{ width: `${((r.mean - min) / Math.max(0.01, max - min)) * 90 + 10}%`, background: r.level === best ? '#2da84f' : '#cdd2cf' }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
