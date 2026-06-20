import { useSeed } from '../../seedStore'
import { useApp } from '../../store'
import { Card, SectionTitle, Stat, Icon, Btn, StatusChip, Pill } from '../../ui'
import { CountUp } from '../../components/Delight'

export function SeedDashboard() {
  const { demos, fields, contracts, tasks } = useSeed()
  const { go } = useApp()

  const soldPU = contracts.reduce((s, c) => s + c.pu, 0)
  const activeDemos = demos.filter((d) => d.status !== 'в контракт').length
  const wonDemos = demos.filter((d) => d.status === 'в контракт').length
  const conv = demos.length ? Math.round((wonDemos / demos.length) * 100) : 0
  const harvested = demos.filter((d) => d.yieldMine != null)
  const avgYield = harvested.length ? (harvested.reduce((s, d) => s + (d.yieldMine || 0), 0) / harvested.length).toFixed(1) : '—'
  const alerts = fields.filter((f) => f.status !== 'ok')
  const toSettle = contracts.filter((c) => c.status === 'расчёт по факту')

  return (
    <div>
      <SectionTitle sub="Genesis · операционная сводка семеновода. Всё хозяйство «семена → поле → результат → деньги» на одном экране.">
        Главная
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card><Stat value={<CountUp value={soldPU} />} label="продано посевных единиц" /></Card>
        <Card><Stat value={<CountUp value={activeDemos} />} label="активных демопосевов" /></Card>
        <Card><Stat value={<CountUp value={conv} suffix="%" />} label="конверсия демо → контракт" accent /></Card>
        <Card><Stat value={avgYield === '—' ? '—' : <CountUp value={Number(avgYield)} decimals={1} suffix=" т/га" />} label="средний результат в поле" /></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Поля под риском */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-ink">Требуют реакции · поля клиентов</span>
            <button onClick={() => go('seedFields')} className="text-sm font-semibold text-brand">Все поля →</button>
          </div>
          <div className="space-y-2">
            {alerts.map((f) => (
              <button key={f.id} onClick={() => go('seedFields')} className="w-full flex items-start gap-3 p-3 rounded-xl bg-canvas hover:bg-brand-soft/40 text-left transition">
                <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: f.status === 'risk' ? '#e5302a' : '#e0900a' }} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">{f.farm} · {f.hybrid}</span>
                  <span className="block text-xs text-muted">{f.alert} · {f.region}, {f.areaHa} га</span>
                </span>
                <StatusChip s={f.status} />
              </button>
            ))}
          </div>
        </Card>

        {/* Колонка действий */}
        <div className="space-y-4">
          <Card>
            <div className="font-bold text-ink mb-2">Деньги по факту</div>
            <Stat value={`${toSettle.length}`} label="контрактов к расчёту риск-шеринга" accent />
            <div className="mt-3"><Btn size="sm" onClick={() => go('seedContracts')}>Открыть контракты</Btn></div>
          </Card>
          <Card>
            <div className="font-bold text-ink mb-2">Сопровождение</div>
            <div className="text-sm text-muted">{tasks.filter((t) => t.status !== 'закрыта').length} открытых задач агрономам</div>
            <div className="mt-3 flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => go('seedFields')}>Задачи</Btn>
              <Btn size="sm" onClick={() => go('seedDemo')}>+ Демо</Btn>
            </div>
          </Card>
          <Card className="bg-brand-soft/40 border-brand/20">
            <div className="flex items-center gap-2 text-sm text-ink font-semibold"><Icon name="FlaskConical" size={16} className="text-brand" />«Орион-С» в госиспытании</div>
            <p className="text-xs text-muted mt-1">Главная ставка регистрации — собирайте доказательство на демо-сети.</p>
            <div className="mt-2"><Pill tone="brand">R&D</Pill></div>
          </Card>
        </div>
      </div>
    </div>
  )
}
