import { useState, useRef, useEffect } from 'react'
import { useAgro } from '../agroStore'
import { useSeed } from '../seedStore'
import { useApp, type ScreenKey } from '../store'
import { getKey, setKey, getModel, setModel, chatOpenAI, DEFAULT_MODEL, type ChatMsg } from '../openai'
import { Sparkles, X, ArrowUp, Map as MapIcon, ShoppingBag, ChevronRight, KeyRound, Check, Bot } from 'lucide-react'

type Action = { label: string; go: ScreenKey }
type Msg = { role: 'ai' | 'user'; text: string; action?: Action }

export function Copilot({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { issues } = useAgro()
  const { demos, contracts, leads } = useSeed()
  const { go, role, copilotAsk, clearCopilotAsk } = useApp()
  const isSeed = role === 'seed'
  const openIssues = issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив')

  const subtitle = isSeed ? 'видит демо-сеть и воронку Genesis' : 'видит всю ферму «Хлеборобное»'
  const suggest = isSeed
    ? ['Сводка по демо-сети', 'Какие демо невалидны', 'Орион-С: статус регистрации', 'Кого двигать в контракт', 'Подбор под Юг']
    : ['Сводка по ферме', 'Риски недели', 'Сравнить с сезоном-2025', 'Подобрать защиту на ХБ07', 'Что ещё подключить?']
  const greeting = isSeed
    ? 'Привет, Надежда. Я вижу демо-сеть Genesis, воронку и контракты. Спросите про валидность демо, подбор гибрида под регион или кого двигать в контракт.'
    : 'Привет, Виктор Степанович. Я вижу всю ферму «Хлеборобное» и историю сезонов. Спросите про поле, риск или данные — или нажмите подсказку ниже.'

  const actionFor = (q: string): Action | undefined => {
    const s = q.toLowerCase()
    if (isSeed) {
      if (s.includes('демо') || s.includes('валид') || s.includes('закладк')) return { label: 'Открыть телематику демо', go: 'seedTelematics' }
      if (s.includes('воронк') || s.includes('контракт') || s.includes('двигать') || s.includes('лид')) return { label: 'Открыть воронку', go: 'seedFunnel' }
      if (s.includes('zone') || s.includes('зон') || s.includes('гибрид') || s.includes('подбор')) return { label: 'Открыть «Мои семена»', go: 'seedHybrids' }
      return undefined
    }
    if (s.includes('хб07') || s.includes('заразих') || s.includes('защит') || s.includes('маркет') || s.includes('купит') || s.includes('заказ') || s.includes('гибрид')) return { label: 'Открыть маркетплейс', go: 'agMarket' }
    if (s.includes('риск') || s.includes('карт') || s.includes('поле') || s.includes('показать')) return { label: 'Показать на карте', go: 'agMap' }
    return undefined
  }

  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: greeting }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [keyVal, setKeyVal] = useState(getKey())
  const [keyDraft, setKeyDraft] = useState('')
  const [model, setModelState] = useState(getModel())
  const [showKey, setShowKey] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => { boxRef.current?.scrollTo(0, boxRef.current.scrollHeight) }, [msgs, busy, open])
  useEffect(() => () => { if (typeTimer.current) clearInterval(typeTimer.current) }, [])

  // посимвольная печать ответа ассистента (живой эффект); action показываем в конце
  const typeOut = (full: string, action?: Action) => {
    if (typeTimer.current) clearInterval(typeTimer.current)
    setMsgs((m) => [...m, { role: 'ai', text: '' }])
    const step = Math.max(1, Math.round(full.length / 90))
    let i = 0
    typeTimer.current = setInterval(() => {
      i = Math.min(full.length, i + step)
      const done = i >= full.length
      const slice = full.slice(0, i)
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'ai', text: slice, action: done ? action : undefined }; return c })
      if (done && typeTimer.current) { clearInterval(typeTimer.current); typeTimer.current = null }
    }, 16)
  }

  const sysPrompt = (): string => {
    if (isSeed) {
      const dl = demos.map((d) => `${d.farm}: ${d.myHybrid} vs ${d.rival} (${d.status}, сев ${d.sown}, NDVI ${d.ndviMine})`).join('; ')
      return `Ты — «Ассистент семеновода», ИИ-ассистент компании Genesis (селекция подсолнечника) в продукте Агро. Отвечай по-русски, кратко (2–5 предложений), по делу.
Genesis: селекция гибридов подсолнечника, демо-сеть у клиентских хозяйств Юга и ЦЧО, сезон 2026. Главная R&D-ставка — гибрид «Орион-С» (в госиспытании, засухоустойчивость на богаре Юга).
Демо-сеть: ${dl || 'нет'}. Контрактов: ${contracts.length}, лидов в воронке: ${leads.length}.
Помогай по: валидности закладки демо (норма высева ~60 тыс/га, окно сева 20.04–05.05, подтверждение площади GPS), Zone-fit подбору гибрида под зону клиента, движению лидов демо→контракт, риск-шерингу контрактов, производству посевных единиц (п.е.). Цифры демонстрационные — не выдавай за точные факты.
ВАЖНО (анти-дезинтермедиация): ты ассистент Genesis. Рекомендуй только гибриды портфеля Genesis, НИКОГДА не советуй семена конкурентов и не уводи клиента; сопровождение идёт под брендом «Дружные всходы».`
    }
    const list = openIssues.map((i) => `${i.fieldName} — ${i.problem.name} (${i.status}, ${i.crop})`).join('; ')
    return `Ты — «Ассистент», ИИ-ассистент агронома в продукте Агро. Отвечай по-русски, кратко (2–5 предложений), по делу.
Ферма: «Хлеборобное», Ростовская обл., 20 полей, ~1912 га, сезон 2026, «сегодня» — 7 июля (подсолнечник в бутонизации, богара Юга).
Открытые проблемы полей: ${list || 'нет'}.
Помогай по полям, рискам, защите растений, погодному окну опрыскивания (ΔT/ветер/инверсия), GDD, влагобалансу, экономике решений (ROI). Цифры демонстрационные — не выдавай их за точные факты; если данных мало, скажи, что подключить (датчики/аналитику «Про»).`
  }

  // умный демо-ответ (фолбэк, когда нет ключа или ошибка API)
  const mockReply = (q: string): string => {
    const s = q.toLowerCase()
    if (isSeed) {
      if (s.includes('невалид') || s.includes('валид') || s.includes('закладк') || s.includes('демо')) return `Демо-сеть: ${demos.length} демо под контролем. По телематике клиента «ООО «Колос»» сев 06.05 — позже окна (20.04–05.05), результат сравнивать напрямую нельзя — нужна оговорка или перезакладка. Остальные заложены по протоколу — годятся как доказательство. Открыть телематику демо?`
      if (s.includes('орион') || s.includes('регистрац') || s.includes('госисп')) return '«Орион-С» — главная ставка, в госиспытании (засухоустойчивость на богаре Юга). На демо КФХ Дон дал 2.9 т/га против 2.1 у ривала. Копите доказательную базу на демо-сети — это аргумент к регистрации и контрактам.'
      if (s.includes('контракт') || s.includes('двигать') || s.includes('воронк') || s.includes('лид')) return `В воронке ${leads.length} лидов, ${contracts.length} контрактов. Двигать в первую очередь демо с подтверждённым преимуществом по NDVI/урожаю и валидной закладкой. Открыть воронку?`
      if (s.includes('zone') || s.includes('зон') || s.includes('подбор') || s.includes('гибрид')) return 'Подбор под регион: на богару Юга — «Орион-С» (засухоустойчивость), под ЦЧО — «Сапфир-КЛ» (Clearfield). Подбор по зоне клиента — в разделе «Мои семена». Открыть?'
      if (s.includes('сводк') || s.includes('демо-сет')) return `Genesis: ${demos.length} демо, ${contracts.length} контрактов, ${leads.length} лидов. Главная ставка — «Орион-С» (госиспытание). Узкие места — в Производстве (мощности размножения). Что показать детальнее?`
      return 'Принял. Это демо-ответ ассистента — подключите ключ OpenAI (иконка ключа выше) для живого ChatGPT.'
    }
    if (s.includes('хб07') || s.includes('заразих') || s.includes('защит')) return 'ХБ07 (подсолнечник, богара Юга): очаг заразихи, NDVI проседает. В 2025-м здесь помог Clearfield-гибрид + «Евро-Лайтнинг». Прогноз потерь без действия ≈ 0.4 т/га (≈0.9 млн ₽). Открыть подбор в маркетплейсе?'
    if (s.includes('риск')) return openIssues.length ? `Риски сейчас: ${openIssues.slice(0, 3).map((i) => `${i.fieldName} — ${i.problem.name}`).join('; ')}. Остальные поля в норме. Показать на карте?` : 'Открытых рисков по полям нет — профилактика по погодному окну в Планировщике.'
    if (s.includes('сводк') || s.includes('ферм')) return `Ферма «Хлеборобное»: 20 полей · ~1 912 га. Требуют решения: ${openIssues.length}. Прогноз сбора — в Аналитике; погодное окно и ночные работы — в Планировщике.`
    if (s.includes('сезон') || s.includes('2025') || s.includes('сравн')) return 'Vs сезон-2025: средняя урожайность +8%, защитой спасено ≈ 4.1 млн ₽ против 2.7 млн годом ранее. Разбор — в «Опытах» и «Аналитике».'
    if (s.includes('подключ') || s.includes('ещё') || s.includes('апсейл') || s.includes('про')) return 'Усилят: датчики влаги почвы, инсоляция и автосистемы платформы, глубокая аналитика потерь по полям (тариф «Про»). Дать оценку эффекта в ₽/га?'
    if (s.includes('опрыскиван') || s.includes('снос') || s.includes('перекрыт') || s.includes('телематик') || s.includes('качеств')) return 'Разбор инцидента: скорость 11.4 км/ч (> норма 8) при ветре 7 м/с и +26 °C — мелкая фракция сносится, перекрытие 12% даёт перерасход СЗР и фитотоксичность по краям. Шаги: 1) снизить до ≤8 км/ч и включить GPS-отсечки секций; 2) краевые проходы перепроверить по NDVI через 5–7 дней; 3) при просадке — краевая доработка. Показать поле на карте?'
    return 'Принял. Это демо-ответ ассистента — подключите ключ OpenAI (иконка ключа выше) для живого ChatGPT.'
  }

  const send = async (txt: string) => {
    if (!txt.trim() || busy) return
    const history: ChatMsg[] = msgs.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: txt }])
    setInput('')
    const action = actionFor(txt)
    if (keyVal) {
      setBusy(true)
      try {
        const reply = await chatOpenAI([{ role: 'system', content: sysPrompt() }, ...history.slice(-10), { role: 'user', content: txt }], keyVal, model)
        setBusy(false); typeOut(reply, action)
      } catch (e) {
        setBusy(false); typeOut(`⚠️ Ошибка API (${(e as Error).message}). Демо-ответ: ${mockReply(txt)}`, action)
      }
    } else {
      setBusy(true)
      setTimeout(() => { setBusy(false); typeOut(mockReply(txt), action) }, 320)
    }
  }

  const saveKey = () => { setKey(keyDraft); setKeyVal(keyDraft); setModel(model); setShowKey(false); setKeyDraft('') }

  // внешний запрос (например, из карточки ИИ-контроля качества в Телематике)
  useEffect(() => { if (open && copilotAsk) { send(copilotAsk); clearCopilotAsk() } }, [open, copilotAsk]) // eslint-disable-line

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="no-print fixed bottom-6 right-6 z-[1500] flex items-center gap-2 bg-brand text-white rounded-2xl pl-4 pr-5 py-3.5 font-bold shadow-2xl hover:brightness-110 transition">
          <Sparkles size={18} />Ассистент
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-[1600] w-[400px] max-w-[92vw] h-[560px] max-h-[80vh] bg-white text-ink rounded-3xl shadow-2xl border border-line flex flex-col overflow-hidden">
          <div className="h-14 shrink-0 bg-brand text-white flex items-center gap-2.5 px-4">
            <span className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center"><Sparkles size={16} /></span>
            <div className="leading-tight">
              <div className="font-bold text-sm flex items-center gap-1.5">Ассистент
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${keyVal ? 'bg-white text-brand' : 'bg-white/25 text-white'}`}>{keyVal ? 'GPT' : 'демо'}</span>
              </div>
              <div className="text-[11px] text-white/70">{subtitle}</div>
            </div>
            <div className="flex-1" />
            <button onClick={() => { setShowKey((v) => !v); setKeyDraft('') }} title="Ключ OpenAI" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><KeyRound size={16} /></button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/15"><X size={18} /></button>
          </div>

          {showKey && (
            <div className="shrink-0 border-b border-line bg-canvas px-4 py-3 space-y-2">
              <div className="text-[11px] text-muted">Ключ OpenAI хранится локально (в браузере), не попадает в репозиторий. Без него — демо-ответы.</div>
              <input type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder={keyVal ? 'ключ сохранён · введите новый для замены' : 'sk-...'} className="w-full bg-white border border-line rounded-lg px-2.5 py-2 text-sm outline-none" />
              <div className="flex items-center gap-2">
                <select value={model} onChange={(e) => setModelState(e.target.value)} className="bg-white border border-line rounded-lg px-2 py-1.5 text-xs">
                  <option value="gpt-4o-mini">gpt-4o-mini</option><option value="gpt-4o">gpt-4o</option><option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </select>
                <button onClick={saveKey} className="text-xs font-bold bg-brand text-white rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><Check size={12} />Сохранить</button>
                {keyVal && <button onClick={() => { setKey(''); setKeyVal('') }} className="text-xs text-muted hover:text-risk">Удалить ключ</button>}
                <span className="ml-auto text-[10px] text-muted">{DEFAULT_MODEL}</span>
              </div>
            </div>
          )}

          <div ref={boxRef} className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3">
            {msgs.map((m, i) => m.role === 'ai' ? (
              <div key={i} className="flex gap-2.5">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-amber-400 text-white grid place-items-center shrink-0 shadow-sm"><Bot size={15} /></span>
                <div className="max-w-[85%]">
                  <div className="bg-canvas rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-snug whitespace-pre-wrap">{m.text}</div>
                  {m.action && <button onClick={() => { go(m.action!.go); setOpen(false) }} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">{m.action.go === 'agMap' ? <MapIcon size={12} /> : m.action.go === 'agMarket' ? <ShoppingBag size={12} /> : <ChevronRight size={12} />}{m.action.label}</button>}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end"><div className="bg-brand text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm max-w-[85%]">{m.text}</div></div>
            ))}
            {busy && <div className="flex gap-2.5"><span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-amber-400 text-white grid place-items-center shrink-0 shadow-sm"><Bot size={15} /></span><div className="bg-canvas rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-muted inline-flex gap-1 items-center"><i className="w-1.5 h-1.5 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: '0ms' }} /><i className="w-1.5 h-1.5 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: '150ms' }} /><i className="w-1.5 h-1.5 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>}
          </div>

          {isSeed && <div className="px-3 pt-1 text-[10px] text-muted">Ассистент Genesis сопровождает под брендом «Дружные всходы» и не предлагает семена конкурентов.</div>}
          <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
            {suggest.map((s) => <button key={s} onClick={() => send(s)} className="text-xs font-semibold bg-canvas hover:bg-line rounded-full px-2.5 py-1.5">{s}</button>)}
          </div>
          <div className="p-3 border-t border-line flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input) }} className="flex-1 bg-canvas rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="Спросите про поле, риск, данные…" />
            <button onClick={() => send(input)} disabled={busy} className="w-10 h-10 rounded-xl bg-brand text-white grid place-items-center shrink-0 disabled:opacity-50"><ArrowUp size={18} /></button>
          </div>
        </div>
      )}
    </>
  )
}
