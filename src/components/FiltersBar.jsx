// components/FiltersBar.jsx
import { Search, SlidersHorizontal, X } from 'lucide-react'

const STAGES = ['Новая', 'В работе', 'Успешно', 'Проиграна']

export default function FiltersBar({ filters, onChange }) {
  const update = (key, val) => onChange({ ...filters, [key]: val })

  const hasFilters = filters.search || filters.dateFrom || filters.dateTo ||
    (filters.stages && filters.stages.length < STAGES.length)

  const reset = () => onChange({ search: '', dateFrom: '', dateTo: '', stages: [...STAGES] })

  const toggleStage = (stage) => {
    const current = filters.stages || [...STAGES]
    const next = current.includes(stage)
      ? current.filter((s) => s !== stage)
      : [...current, stage]
    update('stages', next)
  }

  const stageColors = {
    'Новая':    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    'В работе': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    'Успешно':  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500',
    'Проиграна':'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по кампании…"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          className="input-base pl-8 pr-8"
        />
        {filters.search && (
          <button onClick={() => update('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => update('dateFrom', e.target.value)}
          className="input-base w-auto text-xs"
        />
        <span className="text-gray-400 text-xs">—</span>
        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => update('dateTo', e.target.value)}
          className="input-base w-auto text-xs"
        />
      </div>

      {/* Stage filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SlidersHorizontal size={13} className="text-gray-400 mr-0.5" />
        {STAGES.map((stage) => {
          const active = (filters.stages || STAGES).includes(stage)
          return (
            <button
              key={stage}
              onClick={() => toggleStage(stage)}
              className={`
                text-xs px-2.5 py-1 rounded-full font-medium border transition-all duration-150
                ${active
                  ? `${stageColors[stage]} border-current opacity-100`
                  : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400 opacity-50'
                }
              `}
            >
              {stage}
            </button>
          )
        })}
      </div>

      {/* Reset */}
      {hasFilters && (
        <button onClick={reset} className="btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
          <X size={13} /> Сбросить
        </button>
      )}
    </div>
  )
}
