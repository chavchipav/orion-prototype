import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Role, Tier } from './data'

export type Theme = 'light' | 'dark'

export type ScreenKey =
  | 'agMap' | 'agVegetation' | 'agScouting' | 'agTechcards' | 'agCadastre' | 'agWorks' | 'agWeather' | 'agAnalytics' | 'agRotation'
  | 'agRecommendations' | 'agReference' | 'agClients' | 'agSettings' | 'agMarket' | 'agWarehouse' | 'agTelematics' | 'agVRA' | 'agCalendar' | 'agNutrition' | 'agPlanner' | 'agTrials'
  | 'seedDash' | 'seedDemo' | 'seedFields' | 'seedHybrids' | 'seedContracts' | 'seedFunnel' | 'seedProd' | 'seedCatalog' | 'seedWarehouse' | 'seedTelematics' | 'seedDossier' | 'seedMarket' | 'seedRnD'
  | 'distributor' | 'fintech'
  | 'ownerDash' | 'ownerApprovals' | 'ownerAI' | 'ownerWarehouse' | 'ownerMarket'

type Ctx = {
  role: Role
  setRole: (r: Role) => void
  tier: Tier
  setTier: (t: Tier) => void
  screen: ScreenKey
  go: (s: ScreenKey) => void
  isLocked: (req: Tier) => boolean
  copilotOpen: boolean
  setCopilotOpen: (v: boolean) => void
  copilotAsk: string | null              // вопрос, который надо отправить при открытии
  askCopilot: (q: string) => void         // открыть ассистент и задать вопрос
  clearCopilotAsk: () => void
  // авторизация (мок)
  authed: boolean
  login: (r: Role) => void
  logout: () => void
  welcomeOpen: boolean
  dismissWelcome: () => void
  tourOpen: boolean
  setTourOpen: (v: boolean) => void
  theme: Theme
  toggleTheme: () => void
}

const order: Record<Tier, number> = { free: 0, pro: 1 }
// стартовый экран кабинета по роли
export const DEFAULT_SCREEN: Record<Role, ScreenKey> = { agronom: 'agMap', owner: 'ownerDash', seed: 'seedDash', distributor: 'distributor', bank: 'fintech' }
const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const savedRole = (typeof localStorage !== 'undefined' && localStorage.getItem('agro_role')) as Role | null
  const [authed, setAuthed] = useState(() => typeof localStorage !== 'undefined' && localStorage.getItem('agro_auth') === '1')
  const [role, setRole] = useState<Role>(savedRole || 'seed')
  const [tier, setTier] = useState<Tier>('free')
  const [screen, setScreen] = useState<ScreenKey>(DEFAULT_SCREEN[savedRole || 'seed'])
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [copilotAsk, setCopilotAsk] = useState<string | null>(null)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => (typeof localStorage !== 'undefined' && localStorage.getItem('agro_theme') === 'dark' ? 'dark' : 'light'))
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('agro_theme', theme) } catch { /* ignore */ }
  }, [theme])
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const go = (s: ScreenKey) => setScreen(s)
  const isLocked = (req: Tier) => order[req] > order[tier]
  const askCopilot = (q: string) => { setCopilotAsk(q); setCopilotOpen(true) }
  const clearCopilotAsk = () => setCopilotAsk(null)
  const login = (r: Role) => {
    setRole(r); setScreen(DEFAULT_SCREEN[r]); setAuthed(true); setWelcomeOpen(true)
    try { localStorage.setItem('agro_auth', '1'); localStorage.setItem('agro_role', r) } catch { /* ignore */ }
  }
  const logout = () => { setAuthed(false); setCopilotOpen(false); try { localStorage.removeItem('agro_auth') } catch { /* ignore */ } }
  const dismissWelcome = () => setWelcomeOpen(false)

  return (
    <AppCtx.Provider value={{ role, setRole, tier, setTier, screen, go, isLocked, copilotOpen, setCopilotOpen, copilotAsk, askCopilot, clearCopilotAsk, authed, login, logout, welcomeOpen, dismissWelcome, tourOpen, setTourOpen, theme, toggleTheme }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}
