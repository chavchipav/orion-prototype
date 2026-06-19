import { useEffect, useState } from 'react'
import type { Role } from '../data'
import type { ScreenKey } from '../store'
import { X, ArrowRight, ArrowLeft, Check, Compass } from 'lucide-react'

type Step = { screen: ScreenKey; title: string; body: string }

// Демо-тур: ведёт по ключевым экранам кабинета, переключая их за пользователя.
const TOURS: Record<Role, Step[]> = {
  seed: [
    { screen: 'seedDash', title: 'Главная', body: 'Весь бизнес семеновода на одном экране: продано посевных единиц, активные демо, конверсия демо→контракт и деньги по факту урожая.' },
    { screen: 'seedFunnel', title: 'Клиенты и сделки', body: 'База хозяйств из госреестра + профильные КФХ. Здесь вы привлекаете клиентов, ведёте кейсы и двигаете их в контракт.' },
    { screen: 'seedDemo', title: 'Сравнение с конкурентами', body: 'Главный аргумент продаж: ваш гибрид рядом с конкурентом на реальном поле. Сравнили две строки — увидели преимущество по NDVI и урожаю.' },
    { screen: 'seedRnD', title: 'Поведение семян по регионам', body: 'Как гибрид ведёт себя по климатзонам: средняя и разброс, засуха против нормы, бенчмарк к району и сколько полей за этим стоит.' },
    { screen: 'seedFields', title: 'Поля клиентов', body: 'Каждое поле клиента: NDVI-тренд, статус риска и выгода в рублях. Видите проблему — точечно отправляете агронома.' },
  ],
  agronom: [
    { screen: 'agMap', title: 'Карта полей', body: 'Все поля фермы на спутниковом снимке. Пульсирующие красные кольца — поля под риском: куда реагировать сегодня.' },
    { screen: 'agScouting', title: 'Осмотры и проблемы', body: 'Замыкаем цикл «осмотр → проблема → рекомендация → работа → факт». Открытые проблемы попадают сюда и в уведомления.' },
    { screen: 'agAnalytics', title: 'Аналитика', body: 'Прогноз сбора, экономика решений и сравнение с прошлым сезоном — основа для разговора с владельцем.' },
    { screen: 'agMarket', title: 'Маркетплейс входов', body: 'Семена, СЗР и удобрения с привязкой к проблеме поля. Заявка уходит семеноводу или дистрибьютору.' },
  ],
  owner: [
    { screen: 'ownerDash', title: 'Сводка хозяйства', body: 'Портфель полей, прогноз урожая и P&L — состояние всего хозяйства на одном экране.' },
    { screen: 'ownerApprovals', title: 'Согласования', body: 'Крупные траты и решения, которые ждут вашего одобрения, собраны в одном месте.' },
    { screen: 'ownerAI', title: 'ИИ-отчёт', body: 'Сжатая выжимка по хозяйству: риски, деньги и что требует внимания — без погружения в детали.' },
  ],
  distributor: [
    { screen: 'distributor', title: 'Кабинет дистрибьютора', body: 'Новые заявки из маркетплейса, отсрочки под скоринг поля и сделки по партнёрам.' },
  ],
  bank: [
    { screen: 'fintech', title: 'Риск-данные', body: 'Скоринг залоговых полей, контур верификации данных и параметрика по засухе.' },
  ],
}

export function Tour({ role, open, onClose, go }: { role: Role; open: boolean; onClose: () => void; go: (s: ScreenKey) => void }) {
  const steps = TOURS[role] || []
  const [i, setI] = useState(0)
  useEffect(() => { if (open) setI(0) }, [open])
  useEffect(() => { if (open && steps[i]) go(steps[i].screen) }, [open, i]) // eslint-disable-line

  if (!open || !steps.length) return null
  const s = steps[i]
  const last = i === steps.length - 1
  const finish = () => { onClose() }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1750] flex justify-center px-4 pb-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl bg-white text-ink rounded-2xl shadow-2xl border border-line overflow-hidden animate-[tourIn_.25s_ease-out]">
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#13211a] text-white">
          <span className="w-7 h-7 rounded-lg bg-brand grid place-items-center shrink-0"><Compass size={16} /></span>
          <div className="text-sm font-bold flex-1">Тур по кабинету · шаг {i + 1} из {steps.length}</div>
          <button onClick={finish} className="text-white/60 hover:text-white"><X size={17} /></button>
        </div>
        <div className="p-4">
          <div className="font-bold text-ink mb-1">{s.title}</div>
          <div className="text-sm text-muted leading-snug">{s.body}</div>
          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-brand' : 'w-1.5 bg-line'}`} />)}
            <div className="flex-1" />
            {i > 0 && <button onClick={() => setI(i - 1)} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink px-2.5 py-1.5"><ArrowLeft size={14} />Назад</button>}
            {!last
              ? <button onClick={() => setI(i + 1)} className="inline-flex items-center gap-1 text-sm font-bold bg-brand text-white rounded-xl px-3.5 py-1.5 hover:brightness-110">Далее <ArrowRight size={14} /></button>
              : <button onClick={finish} className="inline-flex items-center gap-1 text-sm font-bold bg-ok text-white rounded-xl px-3.5 py-1.5 hover:brightness-105"><Check size={14} />Понятно</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
