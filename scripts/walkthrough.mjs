// Scenario-driven проход по экранам прототипа ЯндексАгро с анимированным курсором.
// Для каждой РОЛИ задан список РАБОЧИХ СЦЕНАРИЕВ (сессий с целью). Каждый сценарий —
// короткий целевой флоу «зачем → путь по экранам → результат». На выходе на каждый
// сценарий: папка с пошаговыми PNG (статичная раскадровка, можно «поставить паузу») +
// собственный flow.gif (через ffmpeg).
//
// Запуск:  node scripts/walkthrough.mjs <role> [baseUrl]
//   role    — ключ ROLES (пока: semenovod)
//   baseUrl — адрес дев-сервера (по умолчанию http://localhost:5174)
//
// Курсор/подписи — overlay-div в document.body (вне React #root), переживает смену
// экранов. Анимация курсора пошаговая (lerp+easing), не зависит от таймингов рендера.
//
// Шаг (act) задаётся локатором:
//   { nav:'Текст' }                 — кнопка сайдбара по тексту
//   { text:'Текст', scope:'main' }  — вкладка/кнопка по тексту (scope: main|header|sidebar|document)
//   { sel:'css', nth:0 }            — произвольный элемент по CSS (+nth); клик через .click()
// Доп. поля любого act: caption (подпись действия), settle (мс ожидания после клика),
//   name (имя файла-кадра), noShot:true (не сохранять отдельный PNG-кадр, только для GIF).

import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(__dirname, '..')
const BPMN_DIR = resolve(APP_DIR, '..', '..', 'BPMN')

// ─────────────────────────────────────────────────────────────────────────────
// Сценарии роли «Семеновод» (персона: Genesis · Надежда Верещак).
// ─────────────────────────────────────────────────────────────────────────────
const SEMENOVOD = {
  slug: 'semenovod',
  roleKey: 'seed',        // внутренний ключ роли в приложении (для мок-логина)
  roleLabel: 'Семеновод',
  outFolder: 'Семеновод_визуал', // папка под визуал рядом с BPMN-документами
  storyboardDoc: 'Сценарии_Семеновод_раскадровка.md', // раскадровка генерится из прогона
  storyboardTitle: 'Раскадровка рабочих сценариев · Семеновод (Genesis · Надежда)',
  storyboardNote: 'Версия v5 (2026-06-17): кадры пересняты после порта UX-слоя Кости (ТЗ_доработка_по_Косте) — мок-авторизация, простые названия экранов (Группа I), списки-превью с NDVI-спарклайном, кольца «риск» на карте, лепестковая диаграмма в «Подбор под регион», ассистент с тайпингом.',

  scenarios: [
    {
      id: 'S1_proof',
      title: 'S1 · Доказать клиенту ценность гибрида цифрой',
      steps: [
        { nav: 'Главная', caption: 'Захожу на Главную: главная ставка «Орион-С», нужно доказательство под сделку', settle: 1100 },
        { nav: 'Сравнение с конкурентами', caption: 'Открываю «Сравнение с конкурентами» — мой гибрид рядом с конкурентом на реальных полях', settle: 1200 },
        { sel: 'table tbody tr td:first-child input[type="checkbox"]', nth: 0, caption: 'Отмечаю первое демо для сравнения', settle: 500 },
        { sel: 'table tbody tr td:first-child input[type="checkbox"]', nth: 1, caption: 'Отмечаю второе демо — появляется сравнение бок-о-бок', settle: 900 },
        { text: 'Карточка', scope: 'main', nth: 0, caption: 'Открываю карточку-доказательство «проверено полем»', settle: 900 },
        { text: 'Отправить хозяйству', scope: 'document', caption: 'Результат: +т/га к конкуренту и выгода клиента в ₽ → отправляю хозяйству', settle: 900, name: 'proof_sent' },
        { nav: 'Паспорт семян', caption: 'Подкрепляю аргумент: Паспорт семян — бенчмарк против района (спутник) + выгода клиента ₽', settle: 1300 },
      ],
    },
    {
      id: 'S2_zones',
      title: 'S2 · Понять поведение гибрида по климатзонам',
      steps: [
        { nav: 'Поведение семян', caption: 'Поведение семян по регионам: распределение по зонам, засуха vs норма, репрезентативность (n полей)', settle: 1300 },
        { nav: 'Мои семена', caption: 'Мои семена: портфель и статус, «проверено на N полях»', settle: 1100 },
        { text: 'Подбор под регион', scope: 'main', caption: 'Вкладка «Подбор под регион»: лепестковая диаграмма + ранжирование с предупреждениями', settle: 1100 },
        { nav: 'Паспорт семян', caption: 'Паспорт семян: бенчмарк гибрида против медианы/топ-25% района по зонам', settle: 1300 },
        { nav: 'Поля клиентов', caption: 'Сверяю с реальностью: как гибрид идёт у клиентов по зонам (карта)', settle: 2400, name: 'zones_fields' },
      ],
    },
    {
      id: 'S3_lead',
      title: 'S3 · Привлечение через базу клиентов (реестр → сделки)',
      steps: [
        { nav: 'Клиенты и сделки', caption: 'Клиенты и сделки: база компаний — госреестр + профильные хозяйства, фильтр «в стрессе»', settle: 1100 },
        { text: 'В переговоры', scope: 'main', nth: 0, caption: 'Беру подсолнечное хозяйство из стресс-зоны в переговоры (холодный контакт → лид)', settle: 900, name: 'crm_to_funnel' },
        { text: 'Контакты', scope: 'main', caption: 'Контакты и задачи привлечения: кому когда вернуться', settle: 800, name: 'crm_contacts' },
        { text: 'Каналы', scope: 'main', caption: 'Каналы привлечения: конверсия по источникам (выставки/соцсети/сарафан)', settle: 800, name: 'crm_channels' },
        { text: 'Бюджет', scope: 'main', caption: 'Бюджет привлечения и CAC по каналам', settle: 800, name: 'crm_budget' },
        { text: 'Воронка', scope: 'main', caption: 'Сделки в работе: лид→демо→контракт, взвешенный прогноз', settle: 900, name: 'crm_funnel' },
      ],
    },
    {
      id: 'S4_support',
      title: 'S4 · Сопроводить клиента между выездами',
      steps: [
        { nav: 'Главная', caption: 'Захожу на Главную: блок «требуют реакции · поля клиентов»', settle: 1000 },
        { nav: 'Поля клиентов', caption: 'Открываю Поля клиентов — окно в то, что у клиента между выездами (NDVI-тренд, риск)', settle: 2400 },
        { text: 'Сопровождение', scope: 'main', caption: 'Вкладка Сопровождение: алерты по полям → назначить агронома', settle: 900 },
        { text: 'Задача', scope: 'main', nth: 0, caption: 'Перехватываю проблему: ставлю задачу агроному', settle: 900, name: 'task_modal' },
        { nav: 'Контроль закладки демо', caption: 'Проверяю валидность закладки демо (норма высева, окно сева, GPS)', settle: 1100, name: 'support_telematics' },
      ],
    },
    {
      id: 'S5_riskshare',
      title: 'S5 · Верифицировать риск-шеринг по факту урожая',
      steps: [
        { nav: 'Контракты и поставки', caption: 'Захожу в Контракты: мой пилот 60% аванс + остаток по факту урожая', settle: 1100 },
        { text: 'Рассчитать', scope: 'main', nth: 0, caption: 'Жму «Рассчитать» по контракту в статусе «расчёт по факту»', settle: 900 },
        { sel: '.fixed input[type="number"], [class*="z-"] input[type="number"]', nth: 0, caption: 'Платформа подставляет фактический урожай (спутник/датчики)', settle: 700, noShot: true },
        { text: 'Закрыть контракт', scope: 'document', caption: 'Результат: остаток масштабирован по факту, видно выгоду клиента → закрываю', settle: 1000, name: 'settle_result' },
        { text: 'Партии', scope: 'main', caption: 'Партии · подлинность: штрих-код, верификация, защита от контрафакта', settle: 900, name: 'lots_authenticity' },
      ],
    },
    {
      id: 'S6_production',
      title: 'S6 · Произвести чистый F1 и подтвердить качество',
      steps: [
        { nav: 'Закупки', caption: 'Захожу в Закупки: закупка входов под производство (родит. линии, протравитель, СЗР)', settle: 1300 },
        { nav: 'Производство семян', caption: 'Производство семян · размножение F1: участки, путь продукции + цепочка чистоты/сертификации (изоляция, «nick», roguing, апробация)', settle: 1500 },
        { nav: 'Склад семян', caption: 'Склад семян: готовые партии п.е., резерв под контракты, контроль качества', settle: 1100 },
        { nav: 'Контракты и поставки', caption: 'Результат-проверка: подлинность партий и поставка по контрактам', settle: 1100, name: 'prod_lots' },
      ],
    },
    {
      id: 'S7_crm_deal',
      title: 'S7 · Довести клиента до сделки (кейс → сравнение → контракт)',
      steps: [
        { nav: 'Клиенты и сделки', caption: 'Клиенты и сделки · Аккаунты: беру профильное хозяйство в работу по кейсу', settle: 1100 },
        { text: 'Завести демо', scope: 'main', nth: 0, caption: '«Завести демо»: создаю кейс — мой гибрид против конкурента на поле клиента', settle: 900, name: 'crm_case_create' },
        { text: 'Кейсы', scope: 'main', caption: 'Кейсы: компания в сравнении → статус черновик→оффер→выигран, связь с Паспортом семян', settle: 800, name: 'crm_cases' },
        { nav: 'Сравнение с конкурентами', caption: 'Демо по кейсу завелось в сравнении — собираю доказательство под оффер', settle: 1200, name: 'crm_battle' },
        { nav: 'Контракты и поставки', caption: 'Результат: сделка закрывается контрактом с риск-шерингом (60% + по факту)', settle: 1100, name: 'crm_contract' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Кабинет «Агроном» (Виктор Степанович, хозяйство «Хлеборобное»).
// ─────────────────────────────────────────────────────────────────────────────
const AGRONOM = {
  slug: 'agronom', roleKey: 'agronom', roleLabel: 'Агроном', outFolder: 'Агроном_визуал',
  storyboardDoc: 'Демо_Агроном.md', storyboardTitle: 'Демо кабинета агронома',
  storyboardNote: 'Цифровой двойник поля: от карты и осмотра — к рекомендации, работе и закупке входа.',
  scenarios: [
    { id: 'A1_cycle', title: 'A1 · Цикл проблемы поля: карта → решение', steps: [
      { nav: 'Осмотры и алерты', caption: 'Открытые проблемы полей: что обнаружено, статус, культура', settle: 1100 },
      { nav: 'Обзор и карта', caption: 'Все поля на спутнике; пульсирующие красные кольца — поля под риском, куда ехать сегодня', settle: 2300 },
      { nav: 'Рекомендации', caption: 'Что сделать: рекомендация под проблему с обоснованием и ROI решения', settle: 1100 },
      { nav: 'Работы', caption: 'Наряд: рекомендация превращается в задачу технике', settle: 1100 },
      { nav: 'План / факт / прогноз', caption: 'Аналитика сезона: прогноз сбора, экономика хозяйства (waterfall), сравнение с прошлым годом', settle: 1300, name: 'analytics' },
    ]},
    { id: 'A2_precision', title: 'A2 · Точность и снабжение', steps: [
      { nav: 'Вегетация', caption: 'NDVI-динамика поля во времени — где и когда проседает биомасса', settle: 1100 },
      { nav: 'Карта-задание (VRA)', caption: 'Дифференцированное внесение по зонам продуктивности', settle: 1100 },
      { nav: 'Погода и агро-метео', caption: 'Окно опрыскивания: ветер / инверсия / ΔT — когда реально можно в поле', settle: 1100 },
      { nav: 'Маркетплейс входов', caption: 'Заявка на вход под проблему поля — семена / СЗР / удобрения в одном окне', settle: 1400, name: 'market' },
      { text: 'Софт', scope: 'main', settle: 700, noShot: true },
      { text: 'Мониторинг полей (NDVI)', scope: 'main', settle: 700, noShot: true },
      { text: 'Среднее', scope: 'main', caption: 'Тариф Агро: Free (мотор данных) + Pro 55 ₽/га — за то, что по Сколково даёт 200–3000 ₽/га', settle: 1300, name: 'market_pricing' },
      { nav: 'Телематика', caption: 'Контроль техники: GPS-треки, расход ГСМ, антифрод по выработке', settle: 1100 },
    ]},
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Кабинет «Владелец / директор» (Андрей).
// ─────────────────────────────────────────────────────────────────────────────
const OWNER = {
  slug: 'vladelec', roleKey: 'owner', roleLabel: 'Владелец', outFolder: 'Владелец_визуал',
  storyboardDoc: 'Демо_Владелец.md', storyboardTitle: 'Демо кабинета владельца',
  storyboardNote: 'Состояние всего хозяйства на одном экране: прогноз, согласования, деньги, антифрод.',
  scenarios: [
    { id: 'O1_control', title: 'O1 · Контроль хозяйства', steps: [
      { nav: 'Согласования', caption: 'Крупные траты и решения, ждущие одобрения директора', settle: 1100 },
      { nav: 'Дашборд', caption: 'Всё хозяйство на экране: % сезона, прогноз сбора, критические задачи, антифрод', settle: 1300 },
      { nav: 'ИИ-агроном: отчёт', caption: 'Сжатая ИИ-выжимка по хозяйству: риски, деньги, что требует внимания', settle: 1100 },
      { nav: 'Склад · финансы', caption: 'Замороженный в запасах капитал, движения, остатки ниже минимума', settle: 1100 },
      { nav: 'Карта полей', caption: 'Портфель полей хозяйства на спутнике', settle: 2300, name: 'map' },
    ]},
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Кабинет «Дистрибьютор» (Игорь) — одноэкранный.
// ─────────────────────────────────────────────────────────────────────────────
const DISTRIBUTOR = {
  slug: 'distributor', roleKey: 'distributor', roleLabel: 'Дистрибьютор', outFolder: 'Дистрибьютор_визуал',
  storyboardDoc: 'Демо_Дистрибьютор.md', storyboardTitle: 'Демо кабинета дистрибьютора',
  storyboardNote: 'Партнёр, а не вытесняемый: заявки из маркетплейса + финтех-отсрочка как ЕГО инструмент.',
  scenarios: [
    { id: 'D1_channel', title: 'D1 · Партнёр-канал + финтех-отсрочка', steps: [
      { text: 'Взять в работу', scope: 'main', nth: 0, caption: 'Новая заявка из маркетплейса агронома — беру в работу (я партнёр, а не вытесняемый)', settle: 1100 },
      { text: 'Оформить отсрочку', scope: 'main', nth: 0, caption: 'Финтех как МОЙ инструмент: товарная отсрочка под скоринг поля — кредитую дешевле и безопаснее', settle: 1100, name: 'finance' },
    ]},
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Кабинет «Банк / страховщик» (Елена) — одноэкранный, read-only.
// ─────────────────────────────────────────────────────────────────────────────
const BANK = {
  slug: 'bank', roleKey: 'bank', roleLabel: 'Банк', outFolder: 'Банк_визуал',
  storyboardDoc: 'Демо_Банк.md', storyboardTitle: 'Демо кабинета банка / страховщика',
  storyboardNote: 'Верифицированная «память о земле» как сырьё для скоринга и параметрического страхования.',
  scenarios: [
    { id: 'B1_scoring', title: 'B1 · Скоринг залога по полю', steps: [
      { sel: 'main .rounded-2xl', nth: 0, caption: 'Привязка поле ↔ кадастр ↔ юрлицо — основа скоринга залога', settle: 900 },
      { sel: 'main .rounded-2xl', nth: 2, caption: 'Пул институтов — единицы млрд ₽/год (линза финтеха)', settle: 900 },
      { sel: 'main .rounded-2xl', nth: 5, caption: 'Контур верификации: кадастр, антидубль залога, прогноз vs факт, регуляторика 260-ФЗ/НСА/ЦБ', settle: 1100, name: 'verification' },
    ]},
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Обзорный «титульный» проход — один кабинет на 5 ролей (переключатель в шапке).
// ─────────────────────────────────────────────────────────────────────────────
const OVERVIEW = {
  slug: 'obzor', roleKey: 'agronom', roleLabel: 'Обзор', outFolder: 'Обзор_визуал',
  storyboardDoc: 'Демо_Обзор.md', storyboardTitle: 'Демо · единый кабинет на 5 ролей',
  storyboardNote: 'Один продукт, пять ролей: переключение в шапке «Кабинет:». Экосистема вокруг «проверено полем».',
  scenarios: [
    { id: 'P0_overview', title: 'Обзор · единый кабинет на 5 ролей', steps: [
      { text: 'Кабинет:', scope: 'header', caption: 'Один продукт — пять ролей. Переключатель в шапке «Кабинет:»', settle: 1200, name: 'roles_menu' },
      { text: 'Семеновод', scope: 'header', caption: 'Семеновод (Genesis) — якорь, первый платящий wedge', settle: 1500, name: 'seed' },
      { text: 'Кабинет:', scope: 'header', settle: 700, noShot: true },
      { text: 'Владелец', scope: 'header', caption: 'Владелец — состояние всего хозяйства на одном экране', settle: 1500, name: 'owner' },
      { text: 'Кабинет:', scope: 'header', settle: 700, noShot: true },
      { text: 'Дистрибьютор', scope: 'header', caption: 'Дистрибьютор — партнёр-канал + финтех-отсрочка', settle: 1300, name: 'distributor' },
      { text: 'Кабинет:', scope: 'header', settle: 700, noShot: true },
      { text: 'Банк', scope: 'header', caption: 'Банк / страховщик — скоринг залога по полю', settle: 1300, name: 'bank' },
      { text: 'Кабинет:', scope: 'header', settle: 700, noShot: true },
      { text: 'Агроном', scope: 'header', caption: 'Агроном — цифровой двойник поля (бесплатный герой, копит данные)', settle: 2300, name: 'agronom' },
    ]},
  ],
}

const ROLES = { obzor: OVERVIEW, semenovod: SEMENOVOD, agronom: AGRONOM, owner: OWNER, distributor: DISTRIBUTOR, bank: BANK }

// «Успех» сценария — для шапки раздела в раскадровке (ключ = id сценария)
const SUCCESS_BY_ID = {
  S1_proof: 'карточка «проверено полем» (демо-сравнение + бенчмарк против района + выгода ₽) готова и отправлена хозяйству.',
  S2_zones: 'вижу профиль «гибрид × зона» — где силён/слаб, засуха vs норма (дашборд по регионам + лепестковая диаграмма).',
  S3_lead: 'тёплый лид из стресс-зоны заведён в сделки в работе; виден канал и стоимость привлечения.',
  S4_support: 'проблема у клиента перехвачена, задача агроному назначена; закладка демо проверена.',
  S5_riskshare: 'остаток рассчитан по факту платформы; видно, что клиент в плюсе; контракт закрыт.',
  S6_production: 'партии F1 готовы, мощности покрывают спрос, качество и подлинность подтверждены.',
  S7_crm_deal: 'клиент прошёл путь кейс → демо в сравнении → контракт с риск-шерингом.',
}

// Генерация раскадровки (Markdown) из реально снятых кадров — чтобы документ
// не расходился с прототипом при переименованиях.
function writeStoryboard(cfg, captured) {
  const dir = cfg.outFolder || join('screens', cfg.slug)
  const L = []
  L.push(`# ${cfg.storyboardTitle || 'Раскадровка сценариев'}`, '')
  L.push('Покадровый разбор каждого сценария — **статичные скрины каждого действия по порядку**, чтобы можно было', 'спокойно «поставить паузу» и подумать над каждым шагом (в отличие от GIF). Курсор и подпись действия — на', 'каждом кадре. Анализ целей/успеха/оценки — в [`Реализация_Семеновод.md`](Реализация_Семеновод.md).', '')
  L.push(`Анимированный проход каждого сценария целиком — \`${dir}/<id>/flow.gif\`.`, '')
  if (cfg.storyboardNote) L.push(`> **${cfg.storyboardNote}**`, '')
  L.push('---', '')
  for (const sc of captured) {
    L.push(`## ${sc.title}`)
    if (SUCCESS_BY_ID[sc.id]) L.push(`**Успех:** ${SUCCESS_BY_ID[sc.id]}`)
    L.push(`GIF: [\`flow.gif\`](${dir}/${sc.id}/flow.gif)`, '')
    sc.steps.forEach((s, i) => {
      L.push(`**Шаг ${i + 1}.** ${s.caption}`)
      L.push(`![](${dir}/${sc.id}/${s.file})`, '')
    })
    L.push('---', '')
  }
  return L.join('\n')
}

// ── параметры анимации/кадров ───────────────────────────────────────────────
const VIEW = { width: 1440, height: 900 }
const MOVE_FRAMES = 11
const PULSE_FRAMES = 3
const HOLD_FRAMES = 8
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// ── overlay (заголовок сценария + курсор + подпись действия) ────────────────
const OVERLAY_JS = `
(() => {
  if (window.__wt) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif;';
  const title = document.createElement('div'); // верхний чип — сценарий
  title.style.cssText = 'position:absolute;left:50%;top:14px;transform:translateX(-50%);max-width:90%;'
    + 'background:rgba(252,63,29,.95);color:#fff;font-weight:800;font-size:14px;padding:7px 16px;border-radius:11px;'
    + 'box-shadow:0 6px 22px rgba(0,0,0,.35);white-space:nowrap;';
  const cap = document.createElement('div'); // нижний баннер — действие
  cap.style.cssText = 'position:absolute;left:50%;bottom:22px;transform:translateX(-50%);max-width:88%;'
    + 'background:rgba(15,26,20,.94);color:#fff;font-weight:600;font-size:15px;line-height:1.35;'
    + 'padding:11px 18px;border-radius:13px;box-shadow:0 8px 30px rgba(0,0,0,.4);'
    + 'border:1px solid rgba(252,63,29,.55);text-align:center;';
  const cur = document.createElement('div');
  cur.style.cssText = 'position:absolute;left:0;top:0;width:30px;height:30px;will-change:transform;';
  cur.innerHTML = '<div class="wt-pulse" style="position:absolute;left:-9px;top:-9px;width:42px;height:42px;'
    + 'border-radius:50%;background:rgba(252,63,29,.35);transform:scale(0);opacity:0;"></div>'
    + '<svg width="30" height="30" viewBox="0 0 24 24" style="position:absolute;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">'
    + '<path d="M5 2 L5 21 L10 16.5 L13.2 23 L16 21.7 L12.9 15.3 L19.5 15 Z" fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  wrap.appendChild(title); wrap.appendChild(cap); wrap.appendChild(cur); document.body.appendChild(wrap);
  window.__wt = {
    setCursor(x,y){ cur.style.transform='translate('+x+'px,'+y+'px)'; },
    setTitle(t){ title.textContent=t; },
    setCaption(t){ cap.textContent=t; },
    pulse(on){ const p=cur.querySelector('.wt-pulse');
      if(on){ p.style.transition='transform .18s ease-out,opacity .18s'; p.style.transform='scale(1)'; p.style.opacity='1'; }
      else { p.style.transition='transform .25s,opacity .25s'; p.style.transform='scale(0)'; p.style.opacity='0'; } },
  };
})();
`

// browser: резолв элемента по дескриптору → rect{cx,cy} ; и клик
function browserLocate(d, action) {
  const scopeRoot = (s) => s === 'sidebar' ? document.querySelector('aside')
    : s === 'header' ? document.querySelector('header')
    : s === 'main' ? (document.querySelector('main') || document)
    : document
  let el = null
  if (d.sel) {
    const els = [...document.querySelectorAll(d.sel)].filter((e) => e.offsetParent !== null || e.getClientRects().length)
    el = els[d.nth || 0] || null
  } else {
    const q = d.nav || d.text
    const root = scopeRoot(d.nav ? 'sidebar' : (d.scope || 'document'))
    const els = [...root.querySelectorAll('button,[role="button"],a,[role="tab"],label')]
      .filter((e) => (e.offsetParent !== null) && ((e.innerText || '').trim().includes(q)))
    el = els[d.nth || 0] || null
  }
  if (!el) return null
  if (action === 'click') {
    if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.click() }
    else el.click()
    return true
  }
  const r = el.getBoundingClientRect()
  return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
}

async function main() {
  const roleKey = process.argv[2] || 'semenovod'
  const baseUrl = process.argv[3] || 'http://localhost:5173'
  const cfg = ROLES[roleKey]
  if (!cfg) throw new Error(`Неизвестная роль: ${roleKey}. Доступно: ${Object.keys(ROLES).join(', ')}`)

  const browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000, args: ['--no-sandbox', `--window-size=${VIEW.width},${VIEW.height}`] })
  const page = await browser.newPage()
  await page.setViewport({ ...VIEW, deviceScaleFactor: 1 })

  const inject = () => page.evaluate(OVERLAY_JS)
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  let cx = VIEW.width / 2, cy = VIEW.height / 2

  // загрузка + мок-логин под нужную роль (приложение стартует с экрана входа)
  console.log(`→ ${baseUrl}`)
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  // ставим авторизацию/роль и «тихий» демо-режим (без тура и живых тостов в кадре)
  await page.evaluate((rk) => {
    try {
      localStorage.setItem('agro_auth', '1')
      localStorage.setItem('agro_role', rk)
      ;['seed', 'agronom', 'owner', 'distributor', 'bank'].forEach((r) => localStorage.setItem('agro_tour_' + r, '1'))
      localStorage.setItem('agro_demo_quiet', '1')
      localStorage.setItem('agro_theme', 'light')
    } catch { /* ignore */ }
  }, cfg.roleKey || 'seed')
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForSelector('aside', { timeout: 20000 })
  await wait(500)
  // закрыть приветственный экран, если показан
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /В кабинет/i.test(x.textContent || '')); if (b) b.click() })
  await wait(500)
  await inject()

  const captured = [] // для авто-раскадровки: реально снятые кадры по сценариям
  for (const sc of cfg.scenarios) {
    console.log(`\n▶ ${sc.title}`)
    const capSteps = []
    const outDir = join(BPMN_DIR, cfg.outFolder || join('screens', cfg.slug), sc.id)
    const framesDir = join(APP_DIR, '.wt_frames')
    rmSync(framesDir, { recursive: true, force: true }); mkdirSync(framesDir, { recursive: true })
    rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true })

    let frame = 0
    const shotFrame = async () => { await page.screenshot({ path: join(framesDir, `f${String(frame).padStart(5, '0')}.png`) }); frame++ }
    await page.evaluate((t) => window.__wt && window.__wt.setTitle(t), sc.title)

    const moveTo = async (tx, ty, caption) => {
      await page.evaluate((t) => window.__wt && window.__wt.setCaption(t), caption)
      for (let i = 1; i <= MOVE_FRAMES; i++) {
        const k = easeInOut(i / MOVE_FRAMES)
        const x = cx + (tx - cx) * k, y = cy + (ty - cy) * k
        await page.evaluate((x, y) => window.__wt && window.__wt.setCursor(x, y), x, y)
        await shotFrame()
      }
      cx = tx; cy = ty
    }
    const pulse = async () => {
      await page.evaluate(() => window.__wt && window.__wt.pulse(true))
      for (let i = 0; i < PULSE_FRAMES; i++) await shotFrame()
      await page.evaluate(() => window.__wt && window.__wt.pulse(false))
    }

    let pngIdx = 0
    for (const step of sc.steps) {
      const rect = await page.evaluate(browserLocate, step, 'rect')
      if (!rect) { console.warn(`  !! не найден элемент: ${step.nav || step.text || step.sel}`); continue }
      await moveTo(rect.cx, rect.cy, step.caption)
      await pulse()
      await page.evaluate(browserLocate, step, 'click')
      await wait(step.settle || 1000)
      await inject() // overlay мог быть перекрыт модалкой/ремаунтом
      await page.evaluate((t) => window.__wt && window.__wt.setTitle(t), sc.title)
      await page.evaluate((t) => window.__wt && window.__wt.setCaption(t), step.caption)
      for (let i = 0; i < HOLD_FRAMES; i++) await shotFrame()
      if (!step.noShot) {
        pngIdx++
        const label = (step.name || step.nav || step.text || 'act').replace(/[^\wа-яёА-ЯЁ]+/gi, '_').replace(/^_|_$/g, '').slice(0, 26)
        const pngName = `${String(pngIdx).padStart(2, '0')}_${label}.png`
        await page.screenshot({ path: join(outDir, pngName) })
        capSteps.push({ caption: step.caption, file: pngName })
      }
    }
    captured.push({ id: sc.id, title: sc.title, steps: capSteps })

    // GIF сценария
    const gifPath = join(outDir, 'flow.gif')
    execFileSync('ffmpeg', [
      '-y', '-framerate', '10', '-i', join(framesDir, 'f%05d.png'),
      '-vf', 'scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer',
      gifPath,
    ], { stdio: ['ignore', 'ignore', 'inherit'] })
    rmSync(framesDir, { recursive: true, force: true })
    console.log(`  ✓ ${sc.id}: ${pngIdx} кадров + flow.gif`)
  }

  await browser.close()

  // авто-раскадровка (Markdown) — синхронна с реально снятыми кадрами
  if (cfg.storyboardDoc) {
    const docPath = join(BPMN_DIR, cfg.storyboardDoc)
    writeFileSync(docPath, writeStoryboard(cfg, captured), 'utf8')
    console.log(`\n✓ раскадровка: ${docPath}`)
  }
  console.log(`\nГотово: ${join(BPMN_DIR, cfg.outFolder || join('screens', cfg.slug))}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
