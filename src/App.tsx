import { AppProvider, useApp } from './store'
import { SeedProvider } from './seedStore'
import { CrmProvider } from './crmStore'
import { CatalogProvider } from './catalogStore'
import { MarketProvider } from './marketStore'
import { AgroProvider } from './agroStore'
import { ApprovalProvider } from './approvalStore'
import { InventoryProvider } from './inventoryStore'
import { C2CProvider } from './c2cStore'
import { UnifiedShell } from './UnifiedShell'
import { Login, Welcome } from './components/Auth'
import { ToastProvider } from './components/Toast'

// Гейт авторизации: не вошёл → Login; вошёл → доменные сторы + кабинет + Welcome
function Gate() {
  const { authed } = useApp()
  if (!authed) return <Login />
  return (
    <ToastProvider>
    <SeedProvider>
      <CrmProvider>
        <CatalogProvider>
          <MarketProvider>
            <AgroProvider>
              <ApprovalProvider>
                <InventoryProvider>
                  <C2CProvider>
                    <UnifiedShell />
                    <Welcome />
                  </C2CProvider>
                </InventoryProvider>
              </ApprovalProvider>
            </AgroProvider>
          </MarketProvider>
        </CatalogProvider>
      </CrmProvider>
    </SeedProvider>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  )
}
