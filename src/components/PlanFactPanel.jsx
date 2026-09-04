// components/PlanFactPanel.jsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const fmt = (n, style) => {
  if (!n && n !== 0) return '—'
  if (style === 'kzt') return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₸'
  if (style === 'currency') return n.toLocaleString('ru-RU', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (style === 'percent') return n.toFixed(1) + '%'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function PlanFactRow({ label, plan, fact, invert = false, style = 'number', suffix = '' }) {
  if (!plan || plan === 0) return null
  const pct = (fact / plan) * 100
  const isGood = invert ? pct <= 100 : pct >= 100
  const barColor = isGood ? 'bg-emerald-500 dark:bg-emerald-400' : pct >= 80 ? 'bg-amber-400' : 'bg-rose-500'
  const barFill = Math.min(pct, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">{label}</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 text-[11px]">
            план: <span className="font-medium text-zinc-600 dark:text-zinc-300">{fmt(plan, style)}{suffix}</span>
          </span>
          <span className={`font-semibold text-[11px] ${isGood ? 'text-emerald-600 dark:text-emerald-400' : pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            факт: {fmt(fact, style)}{suffix}
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">({pct.toFixed(0)}%)</span>
        </div>
      </div>
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${barFill}%` }}
        />
      </div>
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
            Контроль KPI (общий план-факт)
          </span>
          {hasAnyPlan && (
            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-medium">
              активен
            </span>
          )}
        </div>
        {open ? <ChevronUp size={13} className="text-zinc-400" /> : <ChevronDown size={13} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {/* Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { key: 'budget',  label: 'Бюджет ($)',       placeholder: '5000' },
              { key: 'leads',   label: 'Цель по лидам',    placeholder: '100'  },
              { key: 'cpl',     label: 'Целевой CPL ($)',   placeholder: '20'   },
              { key: 'revenue', label: 'Цель выручки (₸)',  placeholder: '5000000'},
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={placeholder}
                  value={plan[key]}
                  onChange={e => setPlan(p => ({ ...p, [key]: e.target.value }))}
                  className="input-base"
                />
              </div>
            ))}
          </div>

          {/* Progress bars */}
          {hasAnyPlan && totals && (
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
                style="kzt"
              />
            </div>
          )}

          {!hasAnyPlan && (
            <p className="text-[11px] text-zinc-400 text-center py-1">
              Задайте плановые значения выше для сравнения факта с таргетами
            </p>
          )}
        </div>
      )}
    </div>
  )
}
