// ─────────────────────────────────────────────────────────────
// Категории маркетплейса (Удобрения · Техника · Софт) — конфиг-движок.
// Каждая категория: шаги подбора + продукты с параметрами и «проверено полем». Демо-данные.
// ─────────────────────────────────────────────────────────────
import type { ReviewKind } from './reviewsData'

export type MOpt = { v: string; label: string; sub?: string }
export type MStep = { key: string; title: string; multi?: boolean; opts: MOpt[] }
export type MProduct = {
  id: string; name: string; brand: string; desc: string
  params: { label: string; value: string }[]
  rowCols: { t: string; v: string }[]
  proof: { label: string; value: string }[]
  tags: Record<string, string[]>
  price: string; video?: boolean; ours?: boolean
}
export type MCategory = { key: 'fert' | 'tech' | 'soft'; label: string; tint: string; reviewKind: ReviewKind; proofTitle: string; steps: MStep[]; products: MProduct[] }

// ── Удобрения ──
const FERT: MCategory = {
  key: 'fert', label: 'Удобрения', tint: '#7c5cff', reviewKind: 'fert', proofTitle: 'Полевые опыты · прибавка к контролю',
  steps: [
    { key: 'crop', title: 'Культура', opts: ['Кукуруза', 'Подсолнечник', 'Озимая пшеница', 'Соя'].map((v) => ({ v, label: v })) },
    { key: 'goal', title: 'Цель внесения', opts: [{ v: 'Стартовое', label: 'Стартовое (P)' }, { v: 'Основное', label: 'Основное (NPK)' }, { v: 'Подкормка', label: 'Подкормка азотная (N)' }, { v: 'Листовая', label: 'Листовая (микро)' }] },
    { key: 'form', title: 'Форма', opts: [{ v: 'Гранулы', label: 'Гранулы' }, { v: 'КАС', label: 'Жидкое (КАС)' }, { v: 'Микро', label: 'Микроудобрение' }] },
  ],
  products: [
    { id: 'f_urea', name: 'Карбамид', brand: 'Еврохим', desc: 'Высококонцентрированное азотное удобрение для подкормок.', params: [{ label: 'NPK', value: '46-0-0' }, { label: 'Форма', value: 'Гранулы' }, { label: 'Класс', value: '—' }], rowCols: [{ t: 'NPK', v: '46-0-0' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+3.2 ц/га' }, { label: 'Окупаемость', value: '×3.1' }], tags: { goal: ['Подкормка'], form: ['Гранулы'] }, price: '34 000 ₽/т' },
    { id: 'f_uan', name: 'КАС-32', brand: 'Акрон', desc: 'Жидкое азотное удобрение для равномерной подкормки по вегетации.', params: [{ label: 'NPK', value: '32-0-0' }, { label: 'Форма', value: 'Жидкое' }], rowCols: [{ t: 'NPK', v: '32-0-0' }, { t: 'Форма', v: 'КАС' }], proof: [{ label: 'Средняя прибавка', value: '+3.6 ц/га' }, { label: 'Равномерность', value: 'высокая' }], tags: { goal: ['Подкормка'], form: ['КАС'] }, price: '25 000 ₽/т', video: true },
    { id: 'f_map', name: 'Аммофос', brand: 'ФосАгро', desc: 'Стартовое фосфорно-азотное удобрение под сев.', params: [{ label: 'NPK', value: '12-52-0' }, { label: 'Форма', value: 'Гранулы' }], rowCols: [{ t: 'NPK', v: '12-52-0' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+4.1 ц/га' }, { label: 'Ровность всходов', value: 'отлично' }], tags: { goal: ['Стартовое', 'Основное'], form: ['Гранулы'] }, price: '56 000 ₽/т' },
    { id: 'f_npk', name: 'Нитроаммофоска', brand: 'ФосАгро', desc: 'Сбалансированное основное удобрение под все культуры.', params: [{ label: 'NPK', value: '16-16-16' }, { label: 'Форма', value: 'Гранулы' }], rowCols: [{ t: 'NPK', v: '16-16-16' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+3.8 ц/га' }], tags: { goal: ['Основное'], form: ['Гранулы'] }, price: '42 000 ₽/т' },
    { id: 'f_dap', name: 'Диаммофоска', brand: 'Еврохим', desc: 'Основное удобрение с повышенным фосфором и калием.', params: [{ label: 'NPK', value: '10-26-26' }, { label: 'Форма', value: 'Гранулы' }], rowCols: [{ t: 'NPK', v: '10-26-26' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+4.4 ц/га' }], tags: { goal: ['Основное'], form: ['Гранулы'] }, price: '50 000 ₽/т' },
    { id: 'f_sas', name: 'Сульфоаммофос', brand: 'ФосАгро', desc: 'Удобрение с серой — особенно для подсолнечника и зерновых.', params: [{ label: 'NPK+S', value: '20-20-0+14S' }, { label: 'Форма', value: 'Гранулы' }], rowCols: [{ t: 'NPK', v: '20-20-0' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+3.9 ц/га' }, { label: 'Масличность', value: '+1.2%' }], tags: { goal: ['Стартовое', 'Основное'], form: ['Гранулы'], crop: ['Подсолнечник', 'Озимая пшеница'] }, price: '38 000 ₽/т' },
    { id: 'f_kcl', name: 'Калий хлористый', brand: 'Уралкалий', desc: 'Калийное удобрение для повышения качества и засухоустойчивости.', params: [{ label: 'NPK', value: '0-0-60' }, { label: 'Форма', value: 'Гранулы' }], rowCols: [{ t: 'NPK', v: '0-0-60' }, { t: 'Форма', v: 'Гранулы' }], proof: [{ label: 'Средняя прибавка', value: '+2.6 ц/га' }], tags: { goal: ['Основное'], form: ['Гранулы'] }, price: '38 000 ₽/т' },
    { id: 'f_micro', name: 'Микро (B, Zn)', brand: 'Буйские удобрения', desc: 'Листовая подкормка микроэлементами в критические фазы.', params: [{ label: 'Состав', value: 'B, Zn, Mn хелаты' }, { label: 'Форма', value: 'Жидкое' }], rowCols: [{ t: 'Состав', v: 'B·Zn·Mn' }, { t: 'Форма', v: 'Микро' }], proof: [{ label: 'Средняя прибавка', value: '+2.3 ц/га' }, { label: 'Налив', value: 'улучшен' }], tags: { goal: ['Листовая'], form: ['Микро'] }, price: '180 000 ₽/т' },
  ],
}

// ── Техника ──
const TECH: MCategory = {
  key: 'tech', label: 'Техника', tint: '#e0900a', reviewKind: 'tech', proofTitle: 'Эксплуатация в хозяйствах',
  steps: [
    { key: 'type', title: 'Тип техники', opts: ['Опрыскиватель', 'Сеялка', 'Трактор', 'Комбайн'].map((v) => ({ v, label: v })) },
    { key: 'width', title: 'Ширина захвата', opts: [{ v: 'до 12 м', label: 'до 12 м' }, { v: '18 м', label: '18 м' }, { v: '24 м', label: '24 м' }, { v: 'не важно', label: 'не важно' }] },
    { key: 'farm', title: 'Площадь хозяйства', opts: [{ v: 'до 3000', label: 'до 3 000 га' }, { v: '3-10к', label: '3–10 000 га' }, { v: '10к+', label: 'свыше 10 000 га' }] },
  ],
  products: [
    { id: 't_amaz_ux', name: 'Amazone UX 5200', brand: 'Amazone', desc: 'Прицепной опрыскиватель 24 м, бак 5200 л.', params: [{ label: 'Тип', value: 'Опрыскиватель' }, { label: 'Захват', value: '24 м' }, { label: 'Производительность', value: 'до 40 га/ч' }, { label: 'Бак', value: '5200 л' }], rowCols: [{ t: 'Захват', v: '24 м' }, { t: 'Произв.', v: '40 га/ч' }], proof: [{ label: 'Наработка', value: '6.5 тыс. га' }, { label: 'Расход рабочего р-ра', value: '100 л/га' }, { label: 'Надёжность', value: '98%' }], tags: { type: ['Опрыскиватель'], width: ['24 м', 'не важно'], farm: ['3-10к', '10к+'] }, price: 'от 9.5 млн ₽', video: true },
    { id: 't_tuman', name: 'Туман-3', brand: 'Пегас-Агро', desc: 'Самоходный опрыскиватель-разбрасыватель, лёгкий по почве.', params: [{ label: 'Тип', value: 'Опрыскиватель' }, { label: 'Захват', value: '24 м' }, { label: 'Производительность', value: 'до 50 га/ч' }], rowCols: [{ t: 'Захват', v: '24 м' }, { t: 'Произв.', v: '50 га/ч' }], proof: [{ label: 'Наработка', value: '8 тыс. га' }, { label: 'Давление на почву', value: 'низкое' }, { label: 'Надёжность', value: '96%' }], tags: { type: ['Опрыскиватель'], width: ['24 м', 'не важно'], farm: ['до 3000', '3-10к'] }, price: 'от 12 млн ₽' },
    { id: 't_rapid', name: 'Väderstad Rapid 600S', brand: 'Väderstad', desc: 'Прицепная сеялка прямого высева 6 м.', params: [{ label: 'Тип', value: 'Сеялка' }, { label: 'Захват', value: '6 м' }, { label: 'Производительность', value: 'до 6 га/ч' }], rowCols: [{ t: 'Захват', v: '6 м' }, { t: 'Произв.', v: '6 га/ч' }], proof: [{ label: 'Наработка', value: '3.5 тыс. га' }, { label: 'Равномерность глубины', value: 'отлично' }], tags: { type: ['Сеялка'], width: ['до 12 м', 'не важно'], farm: ['до 3000', '3-10к'] }, price: 'от 14 млн ₽' },
    { id: 't_cirrus', name: 'Amazone Cirrus 6003-2', brand: 'Amazone', desc: 'Прицепная сеялка 6 м с возможностью больших скоростей.', params: [{ label: 'Тип', value: 'Сеялка' }, { label: 'Захват', value: '6 м' }, { label: 'Производительность', value: 'до 9 га/ч' }], rowCols: [{ t: 'Захват', v: '6 м' }, { t: 'Произв.', v: '9 га/ч' }], proof: [{ label: 'Наработка', value: '5 тыс. га' }, { label: 'Скорость сева', value: 'до 15 км/ч' }], tags: { type: ['Сеялка'], width: ['до 12 м', 'не важно'], farm: ['3-10к', '10к+'] }, price: 'от 16 млн ₽' },
    { id: 't_k744', name: 'Кировец К-744', brand: 'Петербургский ТЗ', desc: 'Тяжёлый трактор для почвообработки и сева.', params: [{ label: 'Тип', value: 'Трактор' }, { label: 'Мощность', value: '428 л.с.' }, { label: 'Расход', value: 'эконом-режим' }], rowCols: [{ t: 'Мощность', v: '428 л.с.' }, { t: 'Тип', v: 'Трактор' }], proof: [{ label: 'Наработка', value: '11 тыс. мото-ч' }, { label: 'Сервис', value: 'по РФ' }, { label: 'Надёжность', value: '95%' }], tags: { type: ['Трактор'], farm: ['3-10к', '10к+'] }, price: 'от 18 млн ₽' },
    { id: 't_jd8r', name: 'John Deere 8R 410', brand: 'John Deere', desc: 'Универсальный трактор с GPS-автовождением.', params: [{ label: 'Тип', value: 'Трактор' }, { label: 'Мощность', value: '410 л.с.' }, { label: 'Автовождение', value: 'есть' }], rowCols: [{ t: 'Мощность', v: '410 л.с.' }, { t: 'GPS', v: 'есть' }], proof: [{ label: 'Наработка', value: '9 тыс. мото-ч' }, { label: 'Расход топлива', value: 'ниже паспорта' }], tags: { type: ['Трактор'], farm: ['10к+'] }, price: 'от 28 млн ₽', video: true },
    { id: 't_lexion', name: 'Claas Lexion 8700', brand: 'Claas', desc: 'Зерноуборочный комбайн высокой производительности.', params: [{ label: 'Тип', value: 'Комбайн' }, { label: 'Жатка', value: 'до 12 м' }, { label: 'Бункер', value: '13 500 л' }], rowCols: [{ t: 'Жатка', v: '12 м' }, { t: 'Тип', v: 'Комбайн' }], proof: [{ label: 'Наработка', value: '12 тыс. га' }, { label: 'Потери', value: '<1%' }, { label: 'Надёжность', value: '97%' }], tags: { type: ['Комбайн'], width: ['не важно'], farm: ['10к+'] }, price: 'от 45 млн ₽' },
    { id: 't_rsm161', name: 'Ростсельмаш RSM 161', brand: 'Ростсельмаш', desc: 'Комбайн для средних и крупных хозяйств, сервис по РФ.', params: [{ label: 'Тип', value: 'Комбайн' }, { label: 'Жатка', value: 'до 9 м' }, { label: 'Бункер', value: '10 500 л' }], rowCols: [{ t: 'Жатка', v: '9 м' }, { t: 'Тип', v: 'Комбайн' }], proof: [{ label: 'Наработка', value: '9 тыс. га' }, { label: 'Сервис', value: 'быстрый' }], tags: { type: ['Комбайн'], width: ['не важно'], farm: ['3-10к', '10к+'] }, price: 'от 22 млн ₽' },
  ],
}

// ── Софт ──
const SOFT: MCategory = {
  key: 'soft', label: 'Софт', tint: '#2b6def', reviewKind: 'soft', proofTitle: 'Внедрения и эффект',
  steps: [
    { key: 'task', title: 'Главная задача', opts: [{ v: 'Мониторинг', label: 'Мониторинг полей (NDVI)' }, { v: 'Учёт', label: 'Учёт работ / ГСМ' }, { v: 'Точное', label: 'Точное земледелие (VRA)' }, { v: 'Бухгалтерия', label: 'Бухгалтерия агро' }, { v: 'Метео', label: 'Метео-прогноз' }] },
    { key: 'size', title: 'Размер хозяйства', opts: [{ v: 'КФХ', label: 'КФХ (до 3к га)' }, { v: 'Среднее', label: 'Среднее (3–10к)' }, { v: 'Холдинг', label: 'Холдинг (10к+)' }] },
  ],
  products: [
    { id: 's_yandex', name: 'Агро', brand: 'Агро', desc: 'Единый кабинет: спутник, погода, осмотры, сезон-кокпит, маркетплейс, ИИ-агроном.', params: [{ label: 'Задачи', value: 'Мониторинг · Учёт · Точное · Метео' }, { label: 'Интеграции', value: '1С · Росреестр · GPS · Sentinel' }, { label: 'Цена', value: 'базовый — бесплатно' }], rowCols: [{ t: 'Задачи', v: 'всё в одном' }, { t: 'Цена', v: '0–55 ₽/га' }], proof: [{ label: 'Хозяйств', value: 'пилот' }, { label: 'Эффект', value: '+200–3000 ₽/га' }, { label: 'Уникальность', value: 'железо+софт+ИИ' }], tags: { task: ['Мониторинг', 'Учёт', 'Точное', 'Метео'], size: ['КФХ', 'Среднее', 'Холдинг'] }, price: '0–55 ₽/га', ours: true, video: true },
    { id: 's_agromon', name: 'АгроМон', brand: 'Bayer', desc: 'Бесплатная FMS: карта, NDVI, скаутинг, техкарты.', params: [{ label: 'Задачи', value: 'Мониторинг · Осмотры' }, { label: 'Цена', value: 'бесплатно' }], rowCols: [{ t: 'Задачи', v: 'Мониторинг' }, { t: 'Цена', v: '0 ₽' }], proof: [{ label: 'Хозяйств', value: 'тысячи' }, { label: 'Покрытие', value: 'РФ' }], tags: { task: ['Мониторинг', 'Учёт'], size: ['КФХ', 'Среднее', 'Холдинг'] }, price: 'бесплатно' },
    { id: 's_exact', name: 'ExactFarming', brand: 'Айтисфера/ЭФКО', desc: 'Спутник/NDVI + точное земледелие + экономика поля.', params: [{ label: 'Задачи', value: 'Мониторинг · Точное' }, { label: 'Цена', value: '₽/га' }], rowCols: [{ t: 'Задачи', v: 'Точное' }, { t: 'Цена', v: '₽/га' }], proof: [{ label: 'Под мониторингом', value: '12 млн га' }], tags: { task: ['Мониторинг', 'Точное'], size: ['Среднее', 'Холдинг'] }, price: 'от 60 ₽/га/год' },
    { id: 's_agrosignal', name: 'АгроСигнал', brand: 'ИнфоБиС/Уралхим', desc: 'Контроль работ, ГСМ, телеметрия, интеграция с 1С.', params: [{ label: 'Задачи', value: 'Учёт · ГСМ · Телеметрия' }, { label: 'Интеграции', value: '1С' }], rowCols: [{ t: 'Задачи', v: 'Учёт/ГСМ' }, { t: 'Цена', v: '₽/га' }], proof: [{ label: 'Хозяйств', value: 'сотни' }, { label: 'Экономия ГСМ', value: 'до 15%' }], tags: { task: ['Учёт'], size: ['Среднее', 'Холдинг'] }, price: 'от 90 ₽/га/год' },
    { id: 's_assist', name: 'АссистАгро', brand: 'Геомир', desc: 'ИИ/CV-агрономия, рекомендации входов, дроны.', params: [{ label: 'Задачи', value: 'Точное · ИИ-агроном' }], rowCols: [{ t: 'Задачи', v: 'Точное' }, { t: 'ИИ', v: 'CV' }], proof: [{ label: 'Под мониторингом', value: '12 млн га' }], tags: { task: ['Точное', 'Мониторинг'], size: ['Среднее', 'Холдинг'] }, price: 'от 80 ₽/га/год' },
    { id: 's_1c', name: '1С:Агро', brand: '1С', desc: 'Бухгалтерия и управленческий учёт агропредприятия.', params: [{ label: 'Задачи', value: 'Бухгалтерия · Учёт' }, { label: 'Интеграции', value: 'ERP' }], rowCols: [{ t: 'Задачи', v: 'Бухгалтерия' }, { t: 'Цена', v: 'лицензия' }], proof: [{ label: 'Внедрений', value: 'тысячи' }], tags: { task: ['Бухгалтерия', 'Учёт'], size: ['КФХ', 'Среднее', 'Холдинг'] }, price: 'лицензия' },
    { id: 's_meteum', name: 'Погода · агро-метео', brand: 'Агро', desc: 'Точный метео-прогноз по координатам поля.', params: [{ label: 'Задачи', value: 'Метео-прогноз' }, { label: 'Гранулярность', value: 'по полю' }], rowCols: [{ t: 'Задачи', v: 'Метео' }, { t: 'Цена', v: 'API' }], proof: [{ label: 'Точность', value: 'высокая' }], tags: { task: ['Метео'], size: ['КФХ', 'Среднее', 'Холдинг'] }, price: 'API / включено', ours: true },
  ],
}

export const CATEGORIES: Record<string, MCategory> = { fert: FERT, tech: TECH, soft: SOFT }
