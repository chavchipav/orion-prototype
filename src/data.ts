// ─────────────────────────────────────────────────────────────
// Агро — роли, тарифы и кабинет дистрибьютора (мок).
// Доменные данные кабинетов живут в agronomData*.ts / seedData.ts / catalogData.ts.
// ─────────────────────────────────────────────────────────────

// Название продукта (placeholder — легко переименовать в одном месте).
export const BRAND = 'Агро'

export type Role = 'agronom' | 'owner' | 'seed' | 'distributor' | 'bank'
export type Tier = 'free' | 'pro'
export type Status = 'ok' | 'warn' | 'risk'

export const ROLES: { key: Role; label: string; who: string }[] = [
  { key: 'agronom', label: 'Агроном', who: 'Виктор Степанович · гл. агроном «Зари»' },
  { key: 'owner', label: 'Владелец', who: 'Андрей · директор хозяйства' },
  { key: 'seed', label: 'Семеновод', who: 'Надежда · Genesis, селекция подсолнечника' },
  { key: 'distributor', label: 'Дистрибьютор', who: 'Игорь · входы по Югу' },
  { key: 'bank', label: 'Банк / страховщик', who: 'Елена · риск-менеджер' },
]

export const TIERS: { key: Tier; label: string; pricePerHa: number; note: string }[] = [
  { key: 'free', label: 'Бесплатно', pricePerHa: 0, note: 'ИИ-агроном, спутник, погода, история поля — мотор данных' },
  { key: 'pro', label: 'Про', pricePerHa: 55, note: 'спутник/БПЛА CV-скаутинг, Метеум-прогноз, ML-предикт урожая, гео-IT, маркетплейс' },
]

// Кабинет дистрибьютора
export const DIST_CLIENTS = [
  { name: 'Агрофирма «Заря»', ha: 4200, lead: 'СЗР на «Сухую» — корзиночная фаза', status: 'Лид от ассистента' },
  { name: 'КФХ Сергеев', ha: 800, lead: 'Семена подсолнечника на 2026', status: 'Отсрочка до уборки' },
  { name: 'ООО «Колос»', ha: 2600, lead: 'Удобрения, озимый сев', status: 'Активный' },
]
