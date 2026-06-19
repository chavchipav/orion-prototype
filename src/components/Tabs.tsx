export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="inline-flex gap-1 bg-white border border-line rounded-xl p-1 mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${active === t.key ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
