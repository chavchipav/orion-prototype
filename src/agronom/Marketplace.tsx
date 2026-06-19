import { useState } from 'react'
import { SeedSelector } from './SeedSelector'
import { SzrSelector } from './SzrSelector'
import { CategorySelector } from './CategorySelector'
import { RegistryShelf } from './RegistryShelf'
import { SellerMarket } from './SellerMarket'
import { CATEGORIES } from '../marketData'
import { Leaf, FlaskConical, Droplets, Tractor, Cpu, Database, Store } from 'lucide-react'

const CATS = [
  { k: 'seeds', label: 'Семена', icon: Leaf },
  { k: 'szr', label: 'СЗР', icon: FlaskConical },
  { k: 'fert', label: 'Удобрения', icon: Droplets },
  { k: 'tech', label: 'Техника', icon: Tractor },
  { k: 'soft', label: 'Софт', icon: Cpu },
  { k: 'registry', label: 'Каталог из реестра', icon: Database },
  { k: 'sellers', label: 'Витрина продавцов', icon: Store },
]

export function Marketplace() {
  const [cat, setCat] = useState('seeds')
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-line">
        <div className="text-xs text-muted mb-2">Два флоу: <b className="text-ink">экспертный подбор</b> по агрозадаче (вкладки слева) и <b className="text-ink">открытая витрина продавцов</b> — товары и услуги от компаний.</div>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => {
            const I = c.icon
            return (
              <button key={c.k} onClick={() => setCat(c.k)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${cat === c.k ? 'bg-brand text-white border-brand' : 'bg-white text-ink border-line hover:border-brand/50'}`}>
                <I size={15} />{c.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {cat === 'seeds' ? <SeedSelector /> : cat === 'szr' ? <SzrSelector /> : cat === 'registry' ? <RegistryShelf /> : cat === 'sellers' ? <SellerMarket /> : <CategorySelector key={cat} cat={CATEGORIES[cat]} />}
      </div>
    </div>
  )
}
