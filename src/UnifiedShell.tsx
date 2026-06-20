import { useState, useMemo, useEffect, useRef, lazy, Suspense, type ComponentType } from 'react'
import { useApp, type ScreenKey } from './store'
import { useAgro } from './agroStore'
import { useCatalog } from './catalogStore'
import { useMarket } from './marketStore'
import { useApprovals } from './approvalStore'
import { ROLES, BRAND, type Role } from './data'
import { FARM as AG_FARM } from './agronomData'
// экраны грузятся лениво (code-splitting): каждый кабинет/экран — отдельный чанк,
// Recharts/Leaflet подтягиваются только на экранах, где нужны.
const L = (f: () => Promise<Record<string, unknown>>, name: string) => lazy(() => f().then((m) => ({ default: m[name] as ComponentType })))
// agronom
const MapWorkspace = L(() => import('./agronom/MapWorkspace'), 'MapWorkspace')
const Scouting = L(() => import('./agronom/Scouting'), 'Scouting')
const Vegetation = L(() => import('./agronom/Vegetation'), 'Vegetation')
const Techcards = L(() => import('./agronom/Techcards'), 'Techcards')
const Cadastre = L(() => import('./agronom/Cadastre'), 'Cadastre')
const Works = L(() => import('./agronom/Works'), 'Works')
const Weather = L(() => import('./agronom/Weather'), 'Weather')
const Analytics = L(() => import('./agronom/Analytics'), 'Analytics')
const Rotation = L(() => import('./agronom/Rotation'), 'Rotation')
const Recommendations = L(() => import('./agronom/Recommendations'), 'Recommendations')
const Reference = L(() => import('./agronom/Reference'), 'Reference')
const Clients = L(() => import('./agronom/Clients'), 'Clients')
const Settings = L(() => import('./agronom/Settings'), 'Settings')
const Marketplace = L(() => import('./agronom/Marketplace'), 'Marketplace')
const SellerMarket = L(() => import('./agronom/SellerMarket'), 'SellerMarket')
const Calendar = L(() => import('./agronom/Calendar'), 'Calendar')
const Nutrition = L(() => import('./agronom/Nutrition'), 'Nutrition')
const Planner = L(() => import('./agronom/Planner'), 'Planner')
const Trials = L(() => import('./agronom/Trials'), 'Trials')
const Warehouse = L(() => import('./agronom/Warehouse'), 'Warehouse')
const Telematics = L(() => import('./agronom/Telematics'), 'Telematics')
const VRA = L(() => import('./agronom/VRA'), 'VRA')
// seed
const SeedDashboard = L(() => import('./screens/seed/Dashboard'), 'SeedDashboard')
const Catalog = L(() => import('./screens/seed/Catalog'), 'Catalog')
const DemoBattle = L(() => import('./screens/seed/DemoBattle'), 'DemoBattle')
const ClientFields = L(() => import('./screens/seed/ClientFields'), 'ClientFields')
const Hybrids = L(() => import('./screens/seed/Hybrids'), 'Hybrids')
const Contracts = L(() => import('./screens/seed/Contracts'), 'Contracts')
const Funnel = L(() => import('./screens/seed/Funnel'), 'Funnel')
const Production = L(() => import('./screens/seed/Production'), 'Production')
const SeedWarehouse = L(() => import('./screens/seed/Warehouse'), 'SeedWarehouse')
const SeedTelematics = L(() => import('./screens/seed/Telematics'), 'SeedTelematics')
const SeedDossier = L(() => import('./screens/seed/Dossier'), 'SeedDossier')
const RnD = L(() => import('./screens/seed/RnD'), 'RnD')
const Distributor = L(() => import('./screens/Distributor'), 'Distributor')
const Fintech = L(() => import('./screens/Fintech'), 'Fintech')
// owner
const OwnerDashboard = L(() => import('./screens/owner/Dashboard'), 'OwnerDashboard')
const OwnerApprovals = L(() => import('./screens/owner/Approvals'), 'OwnerApprovals')
const OwnerAIReport = L(() => import('./screens/owner/AIReport'), 'OwnerAIReport')
const OwnerWarehouse = L(() => import('./screens/owner/Warehouse'), 'OwnerWarehouse')
import { Copilot } from './components/Copilot'
import { CommandPalette, type CmdItem } from './components/CommandPalette'
import { Tour } from './components/Tour'
import { useToast } from './components/Toast'
import {
  Map, LineChart, Eye, ClipboardList, Landmark, Tractor, CloudSun, BarChart3, PieChart,
  LayoutGrid, FlaskConical, Leaf, ShieldCheck, TrendingUp, Truck, ChevronDown, Bell, HelpCircle, Lightbulb, BookOpen, Users, CalendarDays, ShoppingBag, Droplets, Bot, Sparkles, CheckCircle2, Sprout, Boxes, Wallet, Radar, LogOut, Search, Menu, Moon, Sun, Settings as SettingsIcon, Leaf as Logo, type LucideIcon,
} from 'lucide-react'

const IC: Record<string, LucideIcon> = { Map, LineChart, Eye, ClipboardList, Landmark, Tractor, CloudSun, BarChart3, PieChart, LayoutGrid, FlaskConical, Leaf, ShieldCheck, TrendingUp, Truck, Lightbulb, BookOpen, Users, CalendarDays, ShoppingBag, Droplets, Bot, Sparkles, CheckCircle2, Sprout, Boxes, Wallet, Radar, Settings: SettingsIcon }

type Nav = { key: ScreenKey; label: string; icon: string; bleed?: boolean }
type NavGroup = { group: string; hint?: string; items: Nav[] }

// Агроном — сгруппированная навигация
const AGRO_GROUPS: NavGroup[] = [
  { group: 'Цифровой двойник поля', hint: 'действия с полем', items: [
    { key: 'agMap', label: 'Обзор и карта', icon: 'Map', bleed: true },
    { key: 'agVegetation', label: 'Вегетация', icon: 'LineChart' },
    { key: 'agScouting', label: 'Осмотры и алерты', icon: 'Eye' },
    { key: 'agRecommendations', label: 'Рекомендации', icon: 'Lightbulb' },
    { key: 'agTechcards', label: 'Техкарты', icon: 'ClipboardList' },
    { key: 'agNutrition', label: 'Питание и удобрения', icon: 'Droplets' },
    { key: 'agVRA', label: 'Карта-задание (VRA)', icon: 'LayoutGrid' },
    { key: 'agWorks', label: 'Работы', icon: 'Tractor' },
    { key: 'agPlanner', label: 'Планировщик', icon: 'Bot' },
  ]},
  { group: 'Инфраструктура платформы', hint: 'от орбиты до форсунки', items: [
    { key: 'agWeather', label: 'Погода и агро-метео', icon: 'CloudSun' },
    { key: 'agTelematics', label: 'Телематика', icon: 'Radar' },
  ]},
  { group: 'Аналитика', hint: 'план · прогноз · разбег', items: [
    { key: 'agAnalytics', label: 'План / факт / прогноз', icon: 'BarChart3' },
    { key: 'agTrials', label: 'Опыты', icon: 'FlaskConical' },
  ]},
  { group: 'Снабжение и склад', hint: 'заявки · закупка · остатки', items: [
    { key: 'agMarket', label: 'Маркетплейс входов', icon: 'ShoppingBag' },
    { key: 'agWarehouse', label: 'Склад', icon: 'Boxes' },
  ]},
]
const AGRO_SECONDARY: Nav[] = [
  { key: 'agClients', label: 'Клиенты', icon: 'Users' },
  { key: 'agCadastre', label: 'Кадастр', icon: 'Landmark', bleed: true },
  { key: 'agRotation', label: 'Севооборот', icon: 'PieChart' },
  { key: 'agCalendar', label: 'Календарь', icon: 'CalendarDays' },
  { key: 'agReference', label: 'Справочники', icon: 'BookOpen' },
  { key: 'agSettings', label: 'Настройки', icon: 'Settings' },
]
// Владелец — дашборд-кабинет
const OWNER_GROUPS: NavGroup[] = [
  { group: 'Хозяйство', items: [
    { key: 'ownerDash', label: 'Дашборд', icon: 'LayoutGrid' },
    { key: 'ownerApprovals', label: 'Согласования', icon: 'CheckCircle2' },
    { key: 'ownerAI', label: 'ИИ-агроном: отчёт', icon: 'Sparkles' },
    { key: 'ownerWarehouse', label: 'Склад · финансы', icon: 'Wallet' },
    { key: 'ownerMarket', label: 'Маркетплейс', icon: 'ShoppingBag', bleed: true },
    { key: 'agTelematics', label: 'Телематика', icon: 'Radar' },
    { key: 'agMap', label: 'Карта полей', icon: 'Map', bleed: true },
  ]},
]
// Семеновод — сгруппированная навигация по сценариям работы
// Простые названия (Группа I): ярлыки плейн-языком для демо Надежде —
// «человек простой», жаргон (CRM/R&D/Zone-fit/«Баттл»/Телематика) не цепляет.
// Внутренние ScreenKey/компоненты не трогаем — меняем только видимые label/group.
const SEED_GROUPS: NavGroup[] = [
  { group: 'Обзор', items: [
    { key: 'seedDash', label: 'Главная', icon: 'LayoutGrid' },
  ]},
  { group: 'Продажи и привлечение', hint: 'клиенты · сделки · сравнение', items: [
    { key: 'seedFunnel', label: 'Клиенты и сделки', icon: 'TrendingUp' },
    { key: 'seedDemo', label: 'Сравнение с конкурентами', icon: 'FlaskConical' },
    { key: 'seedCatalog', label: 'Мои предложения', icon: 'BookOpen' },
  ]},
  { group: 'Доказательство и семена', hint: 'поведение по регионам · паспорт', items: [
    { key: 'seedRnD', label: 'Поведение семян по регионам', icon: 'BarChart3' },
    { key: 'seedHybrids', label: 'Мои семена', icon: 'Leaf' },
    { key: 'seedDossier', label: 'Паспорт семян', icon: 'ShieldCheck' },
  ]},
  { group: 'Клиенты', hint: 'сопровождение между выездами', items: [
    { key: 'seedFields', label: 'Поля клиентов', icon: 'Map' },
    { key: 'seedTelematics', label: 'Контроль закладки демо', icon: 'Radar' },
  ]},
  { group: 'Сделки', items: [
    { key: 'seedContracts', label: 'Контракты и поставки', icon: 'ShieldCheck' },
  ]},
  { group: 'Производство', hint: 'закупки · размножение · склад', items: [
    { key: 'seedMarket', label: 'Закупки', icon: 'ShoppingBag', bleed: true },
    { key: 'seedProd', label: 'Производство семян', icon: 'BarChart3' },
    { key: 'seedWarehouse', label: 'Склад семян', icon: 'Boxes' },
  ]},
]
const FLAT_NAV: Record<'distributor' | 'bank', Nav[]> = {
  distributor: [{ key: 'distributor', label: 'Кабинет дистрибьютора', icon: 'Truck' }],
  bank: [{ key: 'fintech', label: 'Риск-данные', icon: 'Landmark' }],
}
const GROUPS_FOR: Partial<Record<Role, NavGroup[]>> = { agronom: AGRO_GROUPS, owner: OWNER_GROUPS, seed: SEED_GROUPS }
function navItems(role: Role): Nav[] {
  if (role === 'agronom') return [...AGRO_GROUPS.flatMap((g) => g.items), ...AGRO_SECONDARY]
  if (role === 'owner') return OWNER_GROUPS.flatMap((g) => g.items)
  if (role === 'seed') return SEED_GROUPS.flatMap((g) => g.items)
  return FLAT_NAV[role as 'distributor' | 'bank']
}
const DEFAULT: Record<Role, ScreenKey> = { agronom: 'agMap', owner: 'ownerDash', seed: 'seedDash', distributor: 'distributor', bank: 'fintech' }

const CONTEXT: Record<Role, { name: string; sub: string }> = {
  agronom: { name: AG_FARM.name, sub: AG_FARM.region },
  owner: { name: AG_FARM.name, sub: 'руководитель' },
  seed: { name: 'Genesis · селекция', sub: 'Надежда Верещак' },
  distributor: { name: 'Входы по Югу', sub: 'дистрибьютор' },
  bank: { name: 'Риск-отдел', sub: 'банк/страховщик' },
}

// заглушка на время подгрузки ленивого чанка экрана
function ScreenLoader() {
  return (
    <div className="h-full grid place-items-center text-muted">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
        Загрузка…
      </div>
    </div>
  )
}

function Screen({ screen }: { screen: ScreenKey }) {
  switch (screen) {
    case 'agMap': return <MapWorkspace />
    case 'agVegetation': return <Vegetation />
    case 'agScouting': return <Scouting />
    case 'agTechcards': return <Techcards />
    case 'agCadastre': return <Cadastre />
    case 'agWorks': return <Works />
    case 'agWeather': return <Weather />
    case 'agAnalytics': return <Analytics />
    case 'agRotation': return <Rotation />
    case 'agRecommendations': return <Recommendations />
    case 'agReference': return <Reference />
    case 'agClients': return <Clients />
    case 'agSettings': return <Settings />
    case 'agMarket': return <Marketplace />
    case 'agWarehouse': return <Warehouse />
    case 'agTelematics': return <Telematics />
    case 'agVRA': return <VRA />
    case 'agCalendar': return <Calendar />
    case 'agNutrition': return <Nutrition />
    case 'agPlanner': return <Planner />
    case 'agTrials': return <Trials />
    case 'ownerDash': return <OwnerDashboard />
    case 'ownerApprovals': return <OwnerApprovals />
    case 'ownerAI': return <OwnerAIReport />
    case 'ownerWarehouse': return <OwnerWarehouse />
    case 'ownerMarket': return <SellerMarket />
    case 'seedDash': return <SeedDashboard />
    case 'seedCatalog': return <Catalog />
    case 'seedDemo': return <DemoBattle />
    case 'seedFields': return <ClientFields />
    case 'seedHybrids': return <Hybrids />
    case 'seedContracts': return <Contracts />
    case 'seedFunnel': return <Funnel />
    case 'seedProd': return <Production />
    case 'seedWarehouse': return <SeedWarehouse />
    case 'seedTelematics': return <SeedTelematics />
    case 'seedDossier': return <SeedDossier />
    case 'seedRnD': return <RnD />
    case 'seedMarket': return <SellerMarket />
    case 'distributor': return <Distributor />
    case 'fintech': return <Fintech />
    default: return <MapWorkspace />
  }
}

export function UnifiedShell() {
  const { role, setRole, screen, go, copilotOpen, setCopilotOpen, logout, tourOpen, setTourOpen, welcomeOpen, theme, toggleTheme } = useApp()
  const { issues } = useAgro()
  const { requests } = useCatalog()
  const { requests: marketRequests } = useMarket()
  const { pendingCount } = useApprovals()
  const [roleMenu, setRoleMenu] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const toast = useToast()
  const livePinged = useRef<Set<Role>>(new Set())
  const me = ROLES.find((r) => r.key === role)
  const items = navItems(role)

  // ⌘K / Ctrl+K — глобальный поиск по экранам
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // демо-тур один раз на роль при входе в кабинет (но не поверх Welcome свежего логина)
  useEffect(() => {
    if (welcomeOpen) return
    try {
      const seen = localStorage.getItem(`agro_tour_${role}`)
      if (!seen) { setTourOpen(true); localStorage.setItem(`agro_tour_${role}`, '1') }
    } catch { /* ignore */ }
  }, [role, welcomeOpen]) // eslint-disable-line

  // живое уведомление вскоре после входа в кабинет (демо-ощущение «система работает»)
  useEffect(() => {
    if (welcomeOpen || tourOpen || livePinged.current.has(role)) return
    try { if (localStorage.getItem('agro_demo_quiet')) return } catch { /* ignore */ }
    const LIVE: Partial<Record<Role, string>> = {
      seed: 'Новая заявка из маркетплейса: КФХ «Восход» интересуется «Орион-С»',
      agronom: 'Погодное окно опрыскивания открывается завтра, 5:00–9:00',
      owner: 'Новое согласование ждёт вашего решения',
      distributor: 'Новая заявка на отсрочку — поле уже ушло в скоринг',
      bank: 'Залоговое поле: NDVI просел 3-й день — пересчитать риск',
    }
    const m = LIVE[role]
    if (!m) return
    const id = setTimeout(() => { toast(m, 'info'); livePinged.current.add(role) }, 4200)
    return () => clearTimeout(id)
  }, [role, welcomeOpen, tourOpen]) // eslint-disable-line

  // источник для ⌘K: видимые экраны роли (с группой для контекста)
  const cmdItems = useMemo<CmdItem[]>(() => {
    const gs = GROUPS_FOR[role]
    if (gs) return gs.flatMap((g) => g.items.map((n) => ({ key: n.key, label: n.label, group: g.group })))
    return navItems(role).map((n) => ({ key: n.key, label: n.label }))
  }, [role])
  const active = items.find((n) => n.key === screen) || items[0]
  const bleed = !!active.bleed
  const ctx = CONTEXT[role]
  const groups = GROUPS_FOR[role]
  const openIssues = issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив').length
  const badgeFor = (key: ScreenKey): number => key === 'agScouting' ? openIssues : key === 'ownerApprovals' ? pendingCount : 0
  const NavBtn = (n: Nav, small = false) => {
    const I = IC[n.icon] || Map
    const on = screen === n.key
    const b = badgeFor(n.key)
    return (
      <button key={n.key} onClick={() => { go(n.key); setNavOpen(false) }}
        className={`w-full flex items-center gap-2.5 rounded-lg transition ${small ? 'px-2 py-1.5 text-[13px]' : 'px-2.5 py-2 text-sm'} ${on ? 'bg-brand/20 text-white' : small ? 'text-white/45 hover:text-white/80 hover:bg-white/5' : 'text-white/65 hover:text-white hover:bg-white/5'}`}>
        <I size={small ? 15 : 17} className={on ? 'text-brand' : ''} /><span className="flex-1 text-left">{n.label}</span>
        {b > 0 && <span className="text-[10px] font-bold bg-brand text-white rounded-full px-1.5 min-w-[18px] text-center">{b}</span>}
      </button>
    )
  }

  const notifs = useMemo<{ id: string; title: string; sub: string; go: ScreenKey; tone: string }[]>(() => {
    if (role === 'agronom' || role === 'owner')
      return issues.filter((i) => i.status === 'открыта' || i.status === 'рецидив').map((i) => ({ id: i.id, title: `${i.fieldName}: ${i.problem.name}`, sub: `${i.status} · требует решения · ${i.crop}`, go: 'agScouting', tone: '#e5302a' }))
    if (role === 'seed')
      return requests.filter((r) => r.status === 'новая').map((r) => ({ id: r.id, title: `Заявка: ${r.farm}`, sub: `${r.hybridName} · ${r.region} · ${r.areaHa} га`, go: 'seedCatalog', tone: '#fc3f1d' }))
    if (role === 'distributor')
      return marketRequests.filter((r) => r.status === 'новая').map((r) => ({ id: r.id, title: `Заявка: ${r.product}`, sub: `${r.category} · ${r.farm} · ${r.region}`, go: 'distributor', tone: '#fc3f1d' }))
    return []
  }, [role, issues, requests, marketRequests])

  const switchRole = (r: Role) => { setRole(r); go(DEFAULT[r]); setRoleMenu(false); setNotifOpen(false); setCopilotOpen(false) }

  return (
    <div className="flex h-screen w-full bg-[#0f1a14] text-white">
      {/* затемнение под drawer на мобильном */}
      {navOpen && <div className="fixed inset-0 z-[1300] bg-black/50 md:hidden" onClick={() => setNavOpen(false)} />}
      {/* sidebar — статичный на десктопе, выезжающий drawer на мобильном */}
      <aside className={`no-print fixed md:static inset-y-0 left-0 z-[1350] w-60 shrink-0 bg-[#13211a] flex flex-col border-r border-black/30 transition-transform md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-black/30">
          <div className="w-7 h-7 rounded-md bg-brand grid place-items-center"><Logo size={16} /></div>
          <div className="font-extrabold tracking-tight">{BRAND}</div>
        </div>
        <div className="px-4 py-3 border-b border-black/30">
          <div className="text-sm font-bold text-white">{ctx.name}</div>
          <div className="text-xs text-white/50">{ctx.sub}</div>
          {/* переключатель кабинета — только на мобильном (в шапке нет места) */}
          <div className="flex flex-wrap gap-1 mt-2 sm:hidden">
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => switchRole(r.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${r.key === role ? 'bg-brand text-white' : 'bg-white/10 text-white/60 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto scroll-thin">
          {groups ? (
            <>
              {groups.map((g) => (
                <div key={g.group} className="px-3 mb-1.5">
                  <div className="px-2 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">{g.group}</div>
                  {g.hint && <div className="px-2 -mt-0.5 mb-1 text-[10px] text-white/25">{g.hint}</div>}
                  {g.items.map((n) => NavBtn(n))}
                </div>
              ))}
              {role === 'agronom' && (
                <>
                  <div className="px-4 my-2 space-y-2">
                    <button onClick={() => go('agMarket')} className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl bg-ok text-white font-bold text-sm hover:brightness-105 transition">
                      <span className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center"><Sprout size={18} /></span><span className="text-left leading-tight">Связаться<br />с семеноводом</span>
                    </button>
                    <button onClick={() => setCopilotOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition">
                      <span className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center"><Sparkles size={18} /></span><span className="text-left leading-tight">Спросить<br />ассистента</span>
                    </button>
                  </div>
                  <div className="px-3 pt-2 mt-1 border-t border-white/5">{AGRO_SECONDARY.map((n) => NavBtn(n, true))}</div>
                </>
              )}
            </>
          ) : (
            <div className="px-3">{items.map((n) => NavBtn(n))}</div>
          )}
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-14 shrink-0 bg-[#13211a] border-b border-black/30 flex items-center px-5 gap-4">
          <button onClick={() => setNavOpen(true)} className="md:hidden text-white/70 hover:text-white -ml-1"><Menu size={20} /></button>
          <span className="text-sm font-semibold truncate">{active.label}</span>
          <div className="flex-1" />
          {/* ⌘K поиск */}
          <button onClick={() => setCmdOpen(true)} className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 text-white/55 rounded-lg pl-2.5 pr-2 py-1.5 transition">
            <Search size={15} /><span className="hidden sm:inline">Поиск</span>
            <kbd className="hidden sm:inline text-[10px] font-semibold bg-white/10 rounded px-1.5 py-0.5 ml-0.5">⌘K</kbd>
          </button>
          {/* role switcher — скрыт на мобильном (вынесен в сайдбар) */}
          <div className="relative hidden sm:block">
            <button onClick={() => setRoleMenu((v) => !v)} className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/15 rounded-lg px-3 py-1.5 font-semibold">
              Кабинет: {ROLES.find((r) => r.key === role)?.label} <ChevronDown size={14} />
            </button>
            {roleMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white text-ink rounded-xl shadow-2xl border border-line py-1 z-[1000]">
                {ROLES.map((r) => (
                  <button key={r.key} onClick={() => switchRole(r.key)} className={`w-full text-left px-3 py-2 text-sm hover:bg-canvas ${r.key === role ? 'font-bold text-brand' : ''}`}>
                    {r.label}<div className="text-[11px] text-muted font-normal">{r.who}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {(role === 'agronom' || role === 'owner' || role === 'seed') && (
            <button className="hidden lg:flex items-center gap-1.5 text-sm text-white/85">Сезон 2026 <ChevronDown size={14} /></button>
          )}
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="relative text-white/60 hover:text-white block">
              <Bell size={17} />
              {notifs.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{notifs.length}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-ink rounded-xl shadow-2xl border border-line z-[1000] overflow-hidden">
                <div className="px-3 py-2 border-b border-line font-bold text-sm">Уведомления{notifs.length > 0 && <span className="text-muted font-normal"> · {notifs.length}</span>}</div>
                <div className="max-h-80 overflow-y-auto scroll-thin">
                  {notifs.map((n) => (
                    <button key={n.id} onClick={() => { go(n.go); setNotifOpen(false) }} className="w-full text-left px-3 py-2.5 hover:bg-canvas border-b border-line last:border-0 flex gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: n.tone }} />
                      <div><div className="text-sm font-semibold text-ink leading-tight">{n.title}</div><div className="text-xs text-muted mt-0.5">{n.sub}</div></div>
                    </button>
                  ))}
                  {!notifs.length && <div className="px-3 py-6 text-center text-sm text-muted">Нет уведомлений</div>}
                </div>
              </div>
            )}
          </div>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} className="text-white/60 hover:text-white">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button onClick={() => setTourOpen(true)} title="Тур по кабинету" className="text-white/60 hover:text-white"><HelpCircle size={17} /></button>
          {/* профиль + выход */}
          <div className="relative">
            <button onClick={() => setProfileOpen((v) => !v)} className="w-8 h-8 rounded-full bg-brand text-white grid place-items-center text-xs font-bold hover:brightness-110">{me?.label[0]}</button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-ink rounded-xl shadow-2xl border border-line z-[1000] overflow-hidden">
                <div className="px-3 py-2.5 border-b border-line">
                  <div className="text-sm font-bold text-ink">{me?.label}</div>
                  <div className="text-[11px] text-muted">{me?.who}</div>
                </div>
                <button onClick={() => { logout(); setProfileOpen(false) }} className="w-full text-left px-3 py-2.5 text-sm hover:bg-canvas text-risk flex items-center gap-2"><LogOut size={15} />Выйти</button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 bg-canvas text-ink">
          <Suspense fallback={<ScreenLoader />}>
            {bleed ? <div key={screen} className="h-full screen-in"><Screen screen={screen} /></div>
              : <div key={screen} className={`h-full overflow-y-auto overflow-x-auto scroll-thin screen-in ${role === 'agronom' || role === 'owner' ? '' : 'p-3 sm:p-6'}`}><Screen screen={screen} /></div>}
          </Suspense>
        </main>
      </div>

      {/* плавающий ассистент (агроном/владелец/семеновод) */}
      {(role === 'agronom' || role === 'owner' || role === 'seed') && <Copilot open={copilotOpen} setOpen={setCopilotOpen} />}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={cmdItems} onPick={(k) => go(k)} />
      <Tour role={role} open={tourOpen} onClose={() => setTourOpen(false)} go={go} />
    </div>
  )
}
