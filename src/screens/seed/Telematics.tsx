import { useSeed } from '../../seedStore'
import type { Demo } from '../../seedData'
import { Card, SectionTitle, Stat, Pill, Icon } from '../../ui'

// Мини-телематика семеновода: техника принадлежит клиенту, поэтому ценность не в
// диспетчерской парка, а в КОНТРОЛЕ ЗАКЛАДКИ ДЕМО по данным телематики клиента
// (норма высева, окно сева, подтверждение площади GPS). Валидное демо = доказательство
// под контракт; невалидное — результат не засчитывается.

const NORM_TARGET = 60          // тыс. семян/га — протокол по подсолнечнику
const WINDOW = { from: 420, to: 505 } // окно сева 20.04–05.05 в ключе MM*100+DD

// «DD.MM» → сортируемый ключ MM*100+DD (строковое сравнение дат day-first неверно)
function dateKey(s: string): number {
  const [dd, mm] = s.split('.').map((x) => parseInt(x, 10))
  return mm * 100 + dd
}

type Qc = {
  norm: number; normOk: boolean
  depth: number
  sownOk: boolean
  gpsHa: number; gpsOk: boolean
  valid: boolean
}

function qc(d: Demo): Qc {
  const h = d.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const norm = 59 + (h % 4)                          // 59..62 тыс/га (клиенты в основном по протоколу)
  const normOk = Math.abs(norm - NORM_TARGET) <= 3  // ±3 от протокола
  const depth = +(4 + (h % 5) * 0.5).toFixed(1)     // 4.0..6.0 см
  const sk = dateKey(d.sown)
  const sownOk = sk >= WINDOW.from && sk <= WINDOW.to
  const area = d.areaHa ?? 250
  const gpsHa = Math.round(area * (0.9 + (h % 7) * 0.02)) // подтверждённая GPS площадь
  const gpsOk = gpsHa >= area * 0.95
  return { norm, normOk, depth, sownOk, gpsHa, gpsOk, valid: normOk && sownOk }
}

export function SeedTelematics() {
  const { demos } = useSeed()
  const rows = demos.map((d) => ({ d, q: qc(d) }))
  const valid = rows.filter((r) => r.q.valid).length
  const flagged = rows.length - valid

  return (
    <div>
      <SectionTitle sub="Техника на демо принадлежит клиенту — мы валидируем закладку по его телематике: норма высева, окно сева, подтверждение площади GPS. Валидное демо = доказательство под контракт.">
        Контроль закладки демо
      </SectionTitle>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <Card><Stat value={rows.length} label="демо под контролем" /></Card>
        <Card><Stat value={valid} label="заложены по протоколу (валидны)" /></Card>
        <Card><Stat value={flagged} label="требуют проверки" accent /></Card>
        <Card><Stat value={`${NORM_TARGET} тыс/га`} label="норма высева (протокол)" /></Card>
      </div>

      <Card pad={false} className="overflow-hidden mb-5">
        <div className="p-4 font-bold text-ink">Закладка демо · данные телематики клиента</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-muted text-xs border-b border-line">
            <th className="text-left font-medium p-3">Демо · гибрид</th>
            <th className="text-left font-medium p-3">Регион · зона</th>
            <th className="text-right font-medium p-3">Норма высева</th>
            <th className="text-right font-medium p-3">Глубина</th>
            <th className="text-left font-medium p-3">Окно сева</th>
            <th className="text-right font-medium p-3">Площадь по GPS</th>
            <th className="text-left font-medium p-3">Вердикт</th>
          </tr></thead>
          <tbody>
            {rows.map(({ d, q }) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                <td className="p-3"><div className="font-semibold text-ink">{d.farm}</div><div className="text-xs text-muted">{d.myHybrid} vs {d.rival}</div></td>
                <td className="p-3 text-muted text-xs">{d.region}<div>{d.zone}</div></td>
                <td className="p-3 text-right"><span className={q.normOk ? 'text-ink' : 'text-risk font-bold'}>{q.norm} тыс/га</span>{!q.normOk && <div className="text-[10px] text-risk">≠ протокол</div>}</td>
                <td className="p-3 text-right text-muted">{q.depth} см</td>
                <td className="p-3"><span className="text-muted">{d.sown}</span> {q.sownOk ? <Pill tone="ok">в окне</Pill> : <Pill tone="brand"><Icon name="AlertTriangle" size={11} />поздно</Pill>}</td>
                <td className="p-3 text-right"><span className={q.gpsOk ? 'text-ink' : 'text-warn'}>{q.gpsHa} га</span></td>
                <td className="p-3">{q.valid ? <Pill tone="ok"><Icon name="ShieldCheck" size={12} />валидно</Pill> : <Pill tone="brand"><Icon name="AlertTriangle" size={12} />проверить</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <div className="rounded-2xl border border-ok/30 bg-ok-soft/40 p-4 flex items-start gap-3">
        <Icon name="ShieldCheck" size={18} className="text-ok shrink-0 mt-0.5" />
        <div className="text-sm text-ink">
          <b>{valid} из {rows.length} демо</b> заложены по протоколу — их результат можно нести клиенту как доказательство в воронке и контрактах.
          {flagged > 0 && <> По «{rows.filter((r) => !r.q.valid).map((r) => r.d.farm).join(', ')}» закладка отклонилась от протокола — итог демо некорректно сравнивать напрямую, нужна оговорка или перезакладка.</>}
        </div>
      </div>
    </div>
  )
}
