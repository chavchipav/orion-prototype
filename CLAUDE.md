# ЯндексАгро — прототип (гид для Claude Code)

Кликабельный макет единого кабинета AgroTech-продукта для команды Growth Lab. Локальный SPA, **все данные —
мок**, бэкенда нет. Этот файл — карта проекта, чтобы можно было сразу менять параметры и пилить функционал.

## Запуск и проверка
```bash
npm install        # один раз
npm run dev        # → http://localhost:5173
npm run build      # tsc -b + vite build → dist/  (этим ПРОВЕРЯЙ типы после правок)
npm run build:single  # весь прототип в ОДИН файл → dist-single/index.html (открыть двойным кликом)
npm run lint
```
После изменений всегда прогоняй `npm run build` — это и есть проверка (TypeScript строгий). Для визуальной
проверки — `npm run dev` и открыть в браузере (карты тянут спутниковые тайлы Esri — нужен интернет).

## Стек
Vite + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`) + Recharts (графики) + Leaflet/react-leaflet
(карты, спутник Esri World Imagery, без API-ключа) + lucide-react (иконки). UI — русский, акцент Яндекса
`#fc3f1d`.

## Архитектура
- **`src/UnifiedShell.tsx`** — единая тёмная GIS-оболочка на все роли: сайдбар (`ROLE_NAV` — пункты меню по
  роли), переключатель ролей в шапке, колокольчик нотификаций, **роутер `Screen`** (switch по `ScreenKey`).
  Добавляешь экран → правишь здесь (`ROLE_NAV` + `case` в `Screen`).
- **`src/store.tsx`** — глобальное состояние: текущая роль (`Role`) и экран (`ScreenKey`), `useApp()`. Тип
  `ScreenKey` — реестр всех экранов.
- **Доменные сторы** (React context, мутабельные): `agroStore.tsx` (единый цикл проблемы агронома:
  Осмотры↔Рекомендации↔Работы↔карта), `seedStore.tsx` (демо/воронка/контракты семеновода), `catalogStore.tsx`
  (каталог семян + заявки семеноводу), `marketStore.tsx` (заявки входов → дистрибьютор).
- **`src/components/MapKit.tsx`** — общий язык карт всех кабинетов: `ZoomBar`, `OverlayCard`, `LayerBar`,
  `LayerToggle`, `NdviLegend`, `FitBounds`, `ringsBounds`, `thumbPath`.
- **`src/ui.tsx`**, **`src/components/`** — общие примитивы (`Card`, `Btn`, `StatusChip`, `Modal`, `Tabs`,
  `Reviews`…). `Modal` имеет `z-[1200]` (выше пэйнов Leaflet — иначе карта перекрывает модалку).

## Карта файлов `src/`
- `agronom/` — экраны кабинета агронома: `MapWorkspace` (карта), `Scouting`, `Vegetation`, `Recommendations`,
  `Techcards`, `Nutrition`, `Cadastre`, `Works`, `Calendar`, `Rotation`, `Weather`, `Reference`, `Clients`,
  `Analytics`, `Settings`, `Chronology` (сезон-кокпит поля), `Marketplace` + селекторы (`SeedSelector`,
  `SzrSelector`, `CategorySelector`).
- `screens/seed/` — 8 экранов семеновода (`Dashboard`, `DemoBattle`, `ClientFields`, `Hybrids`, `Catalog`,
  `Contracts`, `Funnel`, `Production`) + `SeedMap` (drill-in карта клиентов).
- `screens/Distributor.tsx`, `screens/Fintech.tsx` — кабинеты дистрибьютора и банка.
- Данные (мок): `agronomData.ts`/`agronomData2.ts`, `agronomSeason.ts`, `seedData.ts`, `catalogData.ts`,
  `szrData.ts`, `marketData.ts`, `fertData.ts`, `reviewsData.ts`, `data.ts` (роли/тарифы).

## Геометрия полей — РЕАЛЬНАЯ (OSM), генерируется скриптами
Контуры полей на картах — настоящие, из OpenStreetMap (`landuse=farmland`), лежат точно на спутниковом снимке.
- `src/agronomFieldsGeo.ts` — поля фермы агронома/владельца (Зимовники, Ростовская обл.).
- `src/seedFieldsGeo.ts` — поля клиентов семеновода по регионам (для drill-in).
- **Эти файлы АВТО-генерируются — не редактируй вручную.** Чтобы сменить локацию/набор полей:
  ```bash
  node scripts/fetchFields.mjs          # ферма агронома — правь CENTER/BBOX/WANT в шапке скрипта
  node scripts/fetchClientFields.mjs    # поля клиентов семеновода — правь REGION_Q
  ```
  Скрипты тянут Overpass API (нужен интернет), отбирают компактный кластер и пишут TS-файл. Результат
  коммитится → приложение работает офлайн. `agronomData.ts` берёт `ring`+`areaHa` оттуда, а культуру/NDVI/статус
  присваивает детерминированно (seeded PRNG). Кадастр (`agronomData2.ts` `PARCELS`) = контур поля 1:1; GPS-треки
  (`serpentine`) обрезаются по контуру.

## Как делать частые правки
- **Новый экран:** компонент в `agronom/` или `screens/seed/` → ключ в `ScreenKey` (`store.tsx`) → пункт в
  `ROLE_NAV` и `case` в роутере `Screen` (`UnifiedShell.tsx`).
- **Новая категория маркетплейса:** `<Категория>Selector.tsx` (или конфиг в `CategorySelector`) + данные +
  вкладка в `agronom/Marketplace.tsx`. Заявки замыкаются через `catalogStore` (семена) / `marketStore` (входы).
- **Цвета/токены:** `src/index.css` блок `@theme` (`--color-brand` и пр.). Иконки — `lucide-react`.
- **Меню/состав ролей:** `ROLE_NAV` в `UnifiedShell.tsx`; роли — `data.ts` (`ROLES`).

## Конвенции
UI и комментарии — по-русски. Иконки — только lucide (без эмодзи в проде). Тексты/цифры — демо-правдоподобные
(не реальные данные клиентов). ID полей и культуры на ферме рандомизированы seeded-PRNG — не завязывайся на
конкретный `ХБ04`. Состояние сбрасывается перезагрузкой страницы.
