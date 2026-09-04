// components/FiltersBar.jsx
import { useState, useRef, useEffect } from 'react'
import { Search, X, EyeOff, Eye } from 'lucide-react'

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

  const setPreset = (preset) => {
    const today = new Date()
    const fmtIso = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    if (preset === 'all') {
      onChange({ ...filters, dateFrom: '', dateTo: '' })
      return
    }
    if (preset === 'today') {
      const s = fmtIso(today)
      onChange({ ...filters, dateFrom: s, dateTo: s })
      return
    }
    if (preset === 'yesterday') {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const s = fmtIso(y)
      onChange({ ...filters, dateFrom: s, dateTo: s })
      return
    }
    if (preset === '7d') {
      const past = new Date(today)
      past.setDate(past.getDate() - 7)
      onChange({ ...filters, dateFrom: fmtIso(past), dateTo: fmtIso(today) })
      return
    }
    if (preset === '30d') {
      const past = new Date(today)
      past.setDate(past.getDate() - 30)
      onChange({ ...filters, dateFrom: fmtIso(past), dateTo: fmtIso(today) })
      return
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 flex-wrap items-center justify-between">
      <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Фильтр по кампании…"
            value={filters.search || ''}
            onChange={(e) => update('search', e.target.value)}
            className="input-base pl-8 pr-7 w-full"
          />
          {filters.search && (
            <button onClick={() => update('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-lg text-[11px]">
          {[
            { key: 'all', label: 'Всё' },
            { key: 'today', label: 'Сегодня' },
            { key: 'yesterday', label: 'Вчера' },
            { key: '7d', label: '7 дней' },
            { key: '30d', label: '30 дней' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className="px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition-all font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range inputs */}
        <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => update('dateFrom', e.target.value)}
            className="bg-transparent text-[11px] text-zinc-700 dark:text-zinc-300 px-2 py-1 focus:outline-none font-mono"
          />
          <span className="text-zinc-400 text-xs">—</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => update('dateTo', e.target.value)}
            className="bg-transparent text-[11px] text-zinc-700 dark:text-zinc-300 px-2 py-1 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Stage filters & Hidden */}
      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-0.5 rounded-lg">
          {STAGES.map((stage) => {
            const active = (filters.stages || STAGES).includes(stage)
            return (
              <button
                key={stage}
                onClick={() => toggleStage(stage)}
                className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                  active
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {stage}
              </button>
            )
          })}
        </div>

        {/* Hidden Campaigns */}
        {filters.hiddenCampaigns?.length > 0 && (
          <div className="relative flex items-center" ref={menuRef}>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden text-xs">
              <button
                onClick={() => setShowHiddenMenu(!showHiddenMenu)}
                className="text-[11px] px-2 py-1 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
              >
                <EyeOff size={11} className="text-zinc-400" />
                Скрыто: {filters.hiddenCampaigns.length}
              </button>
              <button
                onClick={() => update('hiddenCampaigns', [])}
                className="px-1.5 py-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border-l border-zinc-200 dark:border-zinc-700"
                title="Показать все"
              >
                <X size={11} />
              </button>
            </div>

            {showHiddenMenu && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden py-1 z-50">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  Скрытые кампании
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filters.hiddenCampaigns.map((name) => (
                    <div key={name} className="flex items-center justify-between px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 group">
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate pr-2">{name}</span>
                      <button
                        onClick={() => update('hiddenCampaigns', filters.hiddenCampaigns.filter(c => c !== name))}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1"
                        title="Вернуть в статистику"
                      >
                        <Eye size={12} />
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
          <button
            onClick={reset}
            className="text-[11px] text-zinc-400 hover:text-rose-600 transition-colors px-1.5 py-1"
          >
            Сброс
          </button>
        )}
      </div>
    </div>
  )
}
