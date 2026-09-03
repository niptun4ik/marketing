// components/PlanFactPanel.jsx
import { useState } from 'react'
import { Target, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'

const fmt = (n, style) => {
  if (!n && n !== 0) return '—'
  if (style === 'currency') return n.toLocaleString('ru-RU', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (style === 'percent') return n.toFixed(1) + '%'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function PlanFactRow({ label, plan, fact, invert = false, style = 'number', suffix = '' }) {
  if (!plan || plan === 0) return null
  const pct = (fact / plan) * 100
  // invert = true означает что МЕНЬШЕ — лучше (как CPL)
  const isGood = invert ? pct <= 100 : pct >= 100
  const barColor = isGood ? 'bg-green-500' : pct >= 80 ? 'bg-amber-400' : 'bg-red-500'
  const barFill = Math.min(pct, 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">план: <span className="text-gray-600 dark:text-gray-300 font-medium">{fmt(plan, style)}{suffix}</span></span>
          <span className={`font-semibold ${isGood ? 'text-green-600 dark:text-green-400' : pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            факт: {fmt(fact, style)}{suffix}
          </span>
          {isGood
            ? <TrendingUp size={12} className="text-green-500" />
            : <TrendingDown size={12} className="text-red-500" />
          }
        </div>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${barFill}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 text-right">
        {pct.toFixed(0)}% от плана
      </p>
    </div>
  )
}

export default function PlanFactPanel({ totals }) {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState({
    budget: '',
    leads: '',
    cpl: '',
    revenue: '',
  })

  const p = {
    budget: parseFloat(plan.budget) || 0,
    leads: parseFloat(plan.leads) || 0,
    cpl: parseFloat(plan.cpl) || 0,
    revenue: parseFloat(plan.revenue) || 0,
  }

  const hasAnyPlan = p.budget || p.leads || p.cpl || p.revenue

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target size={15} className="text-brand-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Контроль KPI (план-факт)
          </span>
          {hasAnyPlan && (
            <span className="text-[10px] bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full font-medium">
              активно
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 dark:border-gray-800 pt-4">
          {/* Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'budget',  label: 'Бюджет ($)',       placeholder: '5000' },
              { key: 'leads',   label: 'Цель по лидам',    placeholder: '100'  },
              { key: 'cpl',     label: 'Целевой CPL ($)',   placeholder: '20'   },
              { key: 'revenue', label: 'Цель выручки ($)',  placeholder: '25000'},
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={placeholder}
                  value={plan[key]}
                  onChange={e => setPlan(p => ({ ...p, [key]: e.target.value }))}
                  className="input-base text-sm"
                />
              </div>
            ))}
          </div>

          {/* Progress bars */}
          {hasAnyPlan && totals && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <PlanFactRow
                label="Израсходованный бюджет"
                plan={p.budget} fact={totals.spend}
                style="currency"
                invert={true}
              />
              <PlanFactRow
                label="Лиды (Meta Результаты)"
                plan={p.leads} fact={totals.metaLeads}
              />
              <PlanFactRow
                label="CPL по Meta (цена рез.)"
                plan={p.cpl} fact={totals.metaCpl}
                style="currency"
                invert={true}
              />
              <PlanFactRow
                label="Выручка"
                plan={p.revenue} fact={totals.revenue}
                style="currency"
              />
            </div>
          )}

          {!hasAnyPlan && (
            <p className="text-xs text-gray-400 text-center py-2">
              Введите плановые значения выше, чтобы увидеть прогресс-бары ↑
            </p>
          )}
        </div>
      )}
    </div>
  )
}
