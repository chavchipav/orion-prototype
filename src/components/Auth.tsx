import { useState } from 'react'
import { useApp } from '../store'
import { ROLES, BRAND, type Role } from '../data'
import { Leaf, ArrowRight, Check } from 'lucide-react'

// мок-авторизация: логин → выбор демо-пользователя по роли → Welcome → кабинет
export function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState('demo@agro.ru')
  return (
    <div className="min-h-screen w-full bg-[#0f1a14] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* мягкий брендовый ореол */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(252,63,29,.15), transparent 70%)' }} />
      {/* плавающие частицы (делайт) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => {
          const left = (i * 37 + 7) % 100, size = 3 + (i % 4), dur = 6 + (i % 5), delay = (i % 7) * 0.8
          return <span key={i} className="absolute rounded-full bg-brand/40" style={{ left: `${left}%`, bottom: `${(i * 13) % 60}%`, width: size, height: size, animation: `loginFloat ${dur}s ${delay}s ease-in-out infinite` }} />
        })}
      </div>
      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-2">
          <div className="w-9 h-9 rounded-lg bg-brand grid place-items-center"><Leaf size={20} /></div>
          <div className="text-2xl font-extrabold tracking-tight">{BRAND}</div>
        </div>
        <p className="text-center text-sm text-white/50 mb-7">Единый агро-кабинет · демо-вход без пароля</p>

        <div className="bg-[#13211a] border border-white/10 rounded-2xl p-5">
          <label className="block text-xs text-white/45 mb-1">Почта</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none mb-1" />
          <label className="block text-xs text-white/45 mb-1 mt-3">Пароль</label>
          <input type="password" defaultValue="demo" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none" />

          <div className="text-xs text-white/45 mt-5 mb-2">Войти как (демо-роль):</div>
          <div className="space-y-1.5">
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => login(r.key as Role)} className="w-full group flex items-center gap-3 text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 transition">
                <span className="w-9 h-9 rounded-lg bg-brand/15 text-brand grid place-items-center font-bold text-sm shrink-0">{r.label[0]}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-[11px] text-white/45 truncate">{r.who}</span>
                </span>
                <ArrowRight size={16} className="text-white/30 group-hover:text-brand transition shrink-0" />
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-white/30 mt-4">Демо-прототип. Все данные — мок, бэкенда нет.</p>
      </div>
    </div>
  )
}

const WELCOME: Record<Role, { name: string; sub: string; today: string[] }> = {
  seed: { name: 'Надежда', sub: 'Genesis · селекция подсолнечника', today: ['Доказать ценность гибрида на демо-сети «Сравнение с конкурентами»', 'Привлечь новые хозяйства из стресс-зон (CRM)', 'Закрыть контракты по факту урожая'] },
  agronom: { name: 'Виктор Степанович', sub: 'хозяйство «Хлеборобное»', today: ['Проверить поля под риском на карте', 'Поймать окно опрыскивания по погоде', 'Закрыть осмотры недели'] },
  owner: { name: 'Андрей', sub: 'директор хозяйства', today: ['Согласования и крупные траты', 'Прогноз урожая и P&L по хозяйству', 'Антифрод по технике'] },
  distributor: { name: 'Игорь', sub: 'входы по Югу', today: ['Новые заявки из маркетплейса', 'Оформить отсрочки под скоринг поля', 'Закрыть сделки по партнёрам'] },
  bank: { name: 'Елена', sub: 'риск-менеджер', today: ['Скоринг залоговых полей', 'Контур верификации данных', 'Параметрика по засухе'] },
}

export function Welcome() {
  const { role, welcomeOpen, dismissWelcome } = useApp()
  if (!welcomeOpen) return null
  const w = WELCOME[role]
  return (
    <div className="fixed inset-0 z-[1800] bg-[#0f1a14]/80 backdrop-blur-sm grid place-items-center p-6">
      <div className="w-full max-w-lg bg-white text-ink rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#13211a] text-white p-6">
          <div className="text-xs text-white/50 mb-1">{w.sub}</div>
          <div className="text-2xl font-extrabold">Привет, {w.name}!</div>
          <div className="text-sm text-white/55 mt-1">Вот что важно сегодня в вашем кабинете «{BRAND}».</div>
        </div>
        <div className="p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">Приоритеты дня</div>
          <div className="space-y-2 mb-5">
            {w.today.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5"><span className="w-5 h-5 rounded-full bg-brand-soft text-brand grid place-items-center shrink-0 mt-0.5"><Check size={13} /></span><span className="text-sm text-ink">{t}</span></div>
            ))}
          </div>
          <button onClick={dismissWelcome} className="w-full bg-brand text-white rounded-xl py-3 font-bold hover:brightness-110 transition inline-flex items-center justify-center gap-1.5">В кабинет <ArrowRight size={17} /></button>
        </div>
      </div>
    </div>
  )
}
