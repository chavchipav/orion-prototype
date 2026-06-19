import { useState } from 'react'
import { CROP_COLORS, type Crop } from '../agronomData'
import { Check } from 'lucide-react'

const TABS = [{ k: 'crops', l: 'Культуры' }, { k: 'team', l: 'Команда и доступ' }, { k: 'integ', l: 'Интеграции' }]
const TEAM = [
  { name: 'Лосик Дмитрий', role: 'Администратор', access: 'полный' },
  { name: 'Пётр И.', role: 'Агроном', access: 'осмотры, работы' },
  { name: 'Сергей К.', role: 'Агроном', access: 'осмотры, работы' },
  { name: 'РСХБ (банк)', role: 'Внешний', access: 'просмотр (по согласию)' },
]
const INTEG = [
  { name: 'GPS-трекинг техники', desc: 'Интеграция с системой мониторинга', on: true },
  { name: 'Метеостанции', desc: 'Агроданные с сети станций', on: true },
  { name: 'Росреестр / Кадастр', desc: 'Авто-сопоставление полей с КН', on: true },
  { name: 'Спутник Sentinel', desc: 'NDVI-снимки', on: true },
  { name: '1С / ERP', desc: 'Выгрузка работ и материалов', on: false },
]

export function Settings() {
  const [tab, setTab] = useState('crops')
  return (
    <div className="h-full overflow-y-auto scroll-thin p-6">
      <h2 className="text-xl font-bold text-ink mb-1">Настройки</h2>
      <p className="text-sm text-muted mb-4">Культуры, команда и доступ, интеграции хозяйства</p>

      <div className="inline-flex gap-1 bg-white border border-line rounded-xl p-1 mb-4">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`px-3.5 py-2 rounded-lg text-sm font-semibold ${tab === t.k ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}>{t.l}</button>)}
      </div>

      <div className="max-w-3xl">
        {tab === 'crops' && (
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="font-bold text-ink mb-3">Цвета культур на карте</div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CROP_COLORS) as Crop[]).map((c) => (
                <div key={c} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                  <input type="color" defaultValue={CROP_COLORS[c]} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <span className="text-sm font-medium text-ink">{c}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">Назначьте культурам привычные цвета — как на ваших бумажных картах.</p>
          </div>
        )}
        {tab === 'team' && (
          <div className="bg-white border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs border-b border-line"><th className="text-left font-medium p-3">Пользователь</th><th className="text-left font-medium p-3">Роль</th><th className="text-left font-medium p-3">Доступ</th></tr></thead>
              <tbody>{TEAM.map((m) => (
                <tr key={m.name} className="border-b border-line last:border-0"><td className="p-3 font-semibold text-ink">{m.name}</td><td className="p-3 text-muted">{m.role}</td><td className="p-3 text-muted">{m.access}</td></tr>))}</tbody>
            </table>
          </div>
        )}
        {tab === 'integ' && (
          <div className="space-y-2">
            {INTEG.map((i) => (
              <div key={i.name} className="bg-white border border-line rounded-2xl p-4 flex items-center justify-between">
                <div><div className="font-semibold text-ink">{i.name}</div><div className="text-xs text-muted">{i.desc}</div></div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${i.on ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted'}`}>{i.on && <Check size={13} />}{i.on ? 'подключено' : 'подключить'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
