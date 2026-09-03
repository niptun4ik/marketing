// components/FiltersBar.jsx
import { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal, X, EyeOff, Eye } from 'lucide-react'

const STAGES = ['Новая', 'В работе', 'Успешно', 'Проиграна']

export default function FiltersBar({ filters, onChange }) {
  const [showHiddenMenu, setShowHiddenMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowHiddenMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const update = (key, val) => onChange({ ...filters, [key]: val })

  const hasFilters = filters.search || filters.dateFrom || filters.dateTo ||
    (filters.stages && filters.stages.length < STAGES.length) || (filters.hiddenCampaigns && filters.hiddenCampaigns.length > 0)

  const reset = () => onChange({ search: '', dateFrom: '', dateTo: '', stages: [...STAGES], hiddenCampaigns: [] })

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

      {/* Hidden Campaigns */}
      {filters.hiddenCampaigns?.length > 0 && (
        <div className="relative flex items-center gap-1.5 ml-2 border-l pl-3 border-gray-200 dark:border-gray-700 z-40" ref={menuRef}>
          <EyeOff size={13} className="text-gray-400 mr-0.5" />
          <div className="flex bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-full overflow-hidden transition-shadow shadow-sm hover:shadow">
            <button
              onClick={() => setShowHiddenMenu(!showHiddenMenu)}
              className="text-xs px-2.5 py-1 font-medium text-amber-700 hover:bg-amber-100 transition-colors dark:text-amber-400 flex items-center gap-1"
            >
              Скрыто: {filters.hiddenCampaigns.length}
            </button>
            <button
              onClick={() => update('hiddenCampaigns', [])}
              className="px-1.5 py-1 text-amber-600 hover:bg-amber-200 dark:text-amber-500 dark:hover:bg-amber-800 transition-colors border-l border-amber-200 dark:border-amber-900/50"
              title="Показать все (Сбросить)"
            >
              <X size={12} />
            </button>
          </div>
          
          {showHiddenMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-fade-in py-1">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                Скрытые кампании
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filters.hiddenCampaigns.map((name) => (
                  <div key={name} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 group border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate pr-2">{name}</span>
                    <button
                      onClick={() => update('hiddenCampaigns', filters.hiddenCampaigns.filter(c => c !== name))}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-brand-500 transition-all rounded hover:bg-white dark:hover:bg-gray-600 shadow-sm"
                      title="Вернуть в статистику"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      {hasFilters && (
        <button onClick={reset} className="btn-ghost text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
          <X size={13} /> Сбросить
        </button>
      )}
    </div>
  )
}
