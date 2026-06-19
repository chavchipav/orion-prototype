import { ROTATION } from '../agronomData2'
import { CROP_COLORS, type Crop } from '../agronomData'

export function Rotation() {
  const years = [2023, 2024, 2025, 2026]
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <h2 className="text-xl font-bold text-ink mb-1">Севооборот</h2>
      <p className="text-sm text-muted mb-4">История культур по полям за 4 сезона — контроль чередования</p>

      <div className="bg-white border border-line rounded-2xl overflow-hidden max-w-3xl">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Поле</th>
            {years.map((y) => <th key={y} className="text-left font-medium p-3">{y}</th>)}
          </tr></thead>
          <tbody>
            {ROTATION.map((r) => (
              <tr key={r.field} className="border-b border-line last:border-0">
                <td className="p-3 font-semibold text-ink">{r.field}</td>
                {r.years.map((c) => (
                  <td key={c.year} className="p-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium" style={{ background: CROP_COLORS[c.crop as Crop] + '22', color: '#1a1a1a' }}>
                      <i className="w-2 h-2 rounded-full" style={{ background: CROP_COLORS[c.crop as Crop] }} />{c.crop}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {(Object.keys(CROP_COLORS) as Crop[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-xs text-muted"><i className="w-2.5 h-2.5 rounded-full" style={{ background: CROP_COLORS[c] }} />{c}</span>
        ))}
      </div>
    </div>
  )
}
