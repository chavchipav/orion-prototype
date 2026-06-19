// ─────────────────────────────────────────────────────────────
// Витрина поставщиков — открытый каталог, где продавцы (компании)
// выкладывают товары и услуги. Второй флоу маркетплейса в дополнение
// к экспертному подбору по агрозадаче. Все данные — демо.
// ─────────────────────────────────────────────────────────────

export type Seller = {
  id: string; name: string; kind: string; rating: number; deals: number; region: string; verified: boolean; since: number
}

export const SELLERS: Seller[] = [
  { id: 's_atc', name: 'АгроТехЦентр Юг', kind: 'Техника · запчасти', rating: 4.8, deals: 1240, region: 'Ростовская обл.', verified: true, since: 2014 },
  { id: 's_sem', name: 'ЮгСемЭлита', kind: 'Семена · гибриды', rating: 4.9, deals: 860, region: 'Краснодарский край', verified: true, since: 2011 },
  { id: 's_fos', name: 'ФосАгро-Регион', kind: 'Удобрения', rating: 4.7, deals: 2030, region: 'Воронежская обл.', verified: true, since: 2009 },
  { id: 's_szr', name: 'КропДистрибуция', kind: 'СЗР · протравители', rating: 4.6, deals: 1510, region: 'Ставропольский край', verified: true, since: 2013 },
  { id: 's_korm', name: 'КормоПром', kind: 'Корма · добавки', rating: 4.5, deals: 640, region: 'Ростовская обл.', verified: false, since: 2017 },
  { id: 's_pole', name: 'ПолеСервис', kind: 'Полевые работы', rating: 4.7, deals: 410, region: 'Ростовская обл.', verified: true, since: 2016 },
  { id: 's_elev', name: 'Элеватор-Логистик', kind: 'Хранение · перевозки', rating: 4.6, deals: 520, region: 'Краснодарский край', verified: true, since: 2012 },
  { id: 's_lab', name: 'АгроЛаб', kind: 'Лаборатория · агросопровождение', rating: 4.8, deals: 300, region: 'Ростовская обл.', verified: true, since: 2018 },
  { id: 's_fin', name: 'ФинАгро Консалт', kind: 'Юр. · бухгалтерия', rating: 4.5, deals: 220, region: 'Москва', verified: false, since: 2019 },
]

export const GOODS_CATS = ['Техника', 'Запчасти', 'Семена', 'Удобрения', 'СЗР', 'Корма'] as const
export const SERVICE_CATS = ['Полевые работы', 'Уборка урожая', 'Услуги агронома', 'Ремонт техники', 'Аренда техники', 'Складские услуги', 'Грузоперевозки', 'Лаборатория', 'Юр. и бухгалтерия'] as const

export type Listing = {
  id: string; kind: 'товар' | 'услуга'; cat: string
  name: string; sellerId: string
  price: number | null            // null → «договорная» / «по запросу»
  oldPrice?: number               // для скидки
  unit?: string                   // ₽/шт, ₽/т, ₽/га, ₽/мес
  delivery: 'Доставка' | 'самовывоз' | 'по РФ' | 'нет'
  hit?: boolean                   // спецпредложение / хит
}

export const LISTINGS: Listing[] = [
  // ── ТОВАРЫ ──
  { id: 'l1', kind: 'товар', cat: 'Техника', name: 'Трактор Кировец К-744Р4 (по программе trade-in)', sellerId: 's_atc', price: 18900000, oldPrice: 21500000, unit: '₽/шт', delivery: 'по РФ', hit: true },
  { id: 'l2', kind: 'товар', cat: 'Техника', name: 'Опрыскиватель самоходный Туман-3, 28 м', sellerId: 's_atc', price: 14200000, unit: '₽/шт', delivery: 'по РФ' },
  { id: 'l3', kind: 'товар', cat: 'Техника', name: 'Сеялка точного высева Amazone Precea 6, 12 рядов', sellerId: 's_atc', price: 9800000, oldPrice: 10500000, unit: '₽/шт', delivery: 'Доставка' },
  { id: 'l4', kind: 'товар', cat: 'Запчасти', name: 'Форсунки распыла Lechler ID 120-025 (комплект 36 шт)', sellerId: 's_atc', price: 86000, unit: '₽/компл', delivery: 'Доставка', hit: true },
  { id: 'l5', kind: 'товар', cat: 'Запчасти', name: 'Гусеничный каток в сборе для John Deere 8R', sellerId: 's_atc', price: 142000, unit: '₽/шт', delivery: 'по РФ' },
  { id: 'l6', kind: 'товар', cat: 'Семена', name: 'Семена подсолнечника «Гелиос-310», F1, 1 п.е.', sellerId: 's_sem', price: 18900, unit: '₽/п.е.', delivery: 'Доставка', hit: true },
  { id: 'l7', kind: 'товар', cat: 'Семена', name: 'Семена кукурузы Краснодарский 291 АМВ, 1 п.е.', sellerId: 's_sem', price: 7600, oldPrice: 8400, unit: '₽/п.е.', delivery: 'Доставка' },
  { id: 'l8', kind: 'товар', cat: 'Семена', name: 'Семена сои «Селекта 201», элита, мешок 30 кг', sellerId: 's_sem', price: 3200, unit: '₽/мешок', delivery: 'самовывоз' },
  { id: 'l9', kind: 'товар', cat: 'Удобрения', name: 'Карбамид (NPK 46-0-0), биг-бэг 1 т', sellerId: 's_fos', price: 34000, oldPrice: 37000, unit: '₽/т', delivery: 'по РФ', hit: true },
  { id: 'l10', kind: 'товар', cat: 'Удобрения', name: 'Аммофос (NPK 12-52-0), биг-бэг 1 т', sellerId: 's_fos', price: 52000, unit: '₽/т', delivery: 'по РФ' },
  { id: 'l11', kind: 'товар', cat: 'Удобрения', name: 'Селитра аммиачная (N 34,4%), насыпью', sellerId: 's_fos', price: 28500, unit: '₽/т', delivery: 'самовывоз' },
  { id: 'l12', kind: 'товар', cat: 'СЗР', name: 'Фунгицид Прозаро, КЭ, канистра 5 л', sellerId: 's_szr', price: 17250, oldPrice: 18900, unit: '₽/канистра', delivery: 'Доставка' },
  { id: 'l13', kind: 'товар', cat: 'СЗР', name: 'Гербицид сплошного действия (глифосат 540), 20 л', sellerId: 's_szr', price: 9600, unit: '₽/канистра', delivery: 'по РФ' },
  { id: 'l14', kind: 'товар', cat: 'Корма', name: 'Жмых подсолнечный, протеин 38%, насыпью', sellerId: 's_korm', price: 16800, unit: '₽/т', delivery: 'самовывоз' },
  { id: 'l15', kind: 'товар', cat: 'Корма', name: 'Премикс для КРС П60-1, мешок 25 кг', sellerId: 's_korm', price: 2400, unit: '₽/мешок', delivery: 'Доставка' },

  // ── УСЛУГИ ──
  { id: 'u1', kind: 'услуга', cat: 'Полевые работы', name: 'Опрыскивание СЗР с GPS-контролем нормы', sellerId: 's_pole', price: 650, unit: '₽/га', delivery: 'нет', hit: true },
  { id: 'u2', kind: 'услуга', cat: 'Полевые работы', name: 'Дифференцированное внесение удобрений (VRA)', sellerId: 's_pole', price: 900, unit: '₽/га', delivery: 'нет' },
  { id: 'u3', kind: 'услуга', cat: 'Уборка урожая', name: 'Уборка зерновых комбайном с намолотом', sellerId: 's_pole', price: 2200, unit: '₽/га', delivery: 'нет' },
  { id: 'u4', kind: 'услуга', cat: 'Услуги агронома', name: 'Выездное агросопровождение поля (осмотр + протокол)', sellerId: 's_lab', price: 12000, unit: '₽/выезд', delivery: 'нет' },
  { id: 'u5', kind: 'услуга', cat: 'Лаборатория', name: 'Агрохимический анализ почвы (NPK, гумус, pH)', sellerId: 's_lab', price: 3500, unit: '₽/образец', delivery: 'самовывоз', hit: true },
  { id: 'u6', kind: 'услуга', cat: 'Ремонт техники', name: 'Ремонт/замена форсунок опрыскивателя с поверкой', sellerId: 's_atc', price: null, delivery: 'нет' },
  { id: 'u7', kind: 'услуга', cat: 'Аренда техники', name: 'Аренда трактора с механизатором (смена)', sellerId: 's_pole', price: 28000, unit: '₽/смена', delivery: 'нет' },
  { id: 'u8', kind: 'услуга', cat: 'Складские услуги', name: 'Хранение зерна на элеваторе с подработкой', sellerId: 's_elev', price: 95, unit: '₽/т·мес', delivery: 'нет' },
  { id: 'u9', kind: 'услуга', cat: 'Грузоперевозки', name: 'Перевозка зерна зерновозом по ЮФО', sellerId: 's_elev', price: null, delivery: 'по РФ' },
  { id: 'u10', kind: 'услуга', cat: 'Уборка урожая', name: 'Десикация и уборка подсолнечника под ключ', sellerId: 's_pole', price: 3100, unit: '₽/га', delivery: 'нет' },
  { id: 'u11', kind: 'услуга', cat: 'Юр. и бухгалтерия', name: 'Сопровождение заявки на господдержку/субсидию', sellerId: 's_fin', price: null, delivery: 'нет' },
  { id: 'u12', kind: 'услуга', cat: 'Услуги агронома', name: 'Карта-задание дифвнесения по спутниковому NDVI', sellerId: 's_lab', price: 150, unit: '₽/га', delivery: 'нет' },
]

export function sellerById(id: string): Seller | undefined {
  return SELLERS.find((s) => s.id === id)
}
export function priceLabel(l: Listing): string {
  if (l.price == null) return l.delivery === 'нет' ? 'по запросу' : 'договорная'
  return l.price.toLocaleString('ru-RU') + ' ' + (l.unit?.replace('₽', '₽') ?? '₽')
}
