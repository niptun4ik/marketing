// components/KPICards.jsx
import { TrendingUp, TrendingDown, Percent } from 'lucide-react'

const fmt = (n, opts = {}) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const { style, currency, decimals = 0, suffix = '' } = opts
  if (style === 'currency') {
    return n.toLocaleString('ru-RU', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (style === 'percent') {
    return n.toFixed(decimals) + '%'
  }
  return n.toLocaleString('ru-RU', { maximumFractionDigits: decimals }) + suffix
}

function MetricCard({ label, value, subtext, status, badge }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-tight leading-none">
          {label}
        </span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium tracking-tight ${
            status === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
            status === 'danger' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
          {value}
        </div>
        {subtext && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 tracking-tight">
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}

export default function KPICards({ totals, margin, onMarginChange }) {
  if (!totals) return null
  const { spend, revenue, roas, romi, cpl, metaCpl, wonDeals, bxLeads, metaLeads, impressions, clicks } = totals

  const roasPositive = roas >= 0
  const romiPositive = romi >= 0

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        <MetricCard
          label="Расход (Spend)"
          value={fmt(spend, { style: 'currency' })}
          subtext={`${fmt(impressions, {})} показов`}
        />
        <MetricCard
          label="Выручка"
          value={fmt(revenue, { style: 'currency' })}
          subtext={`${wonDeals} успешных сделок`}
          status={wonDeals > 0 ? 'success' : undefined}
        />
        <MetricCard
          label="ROAS"
          value={fmt(roas, { style: 'percent', decimals: 1 })}
          badge={roasPositive ? 'В плюс' : 'Минус'}
          status={roasPositive ? 'success' : 'danger'}
        />
        <MetricCard
          label="ROMI (чистая маржа)"
          value={fmt(romi, { style: 'percent', decimals: 1 })}
          badge={romiPositive ? 'Прибыль' : 'Убыток'}
          status={romiPositive ? 'success' : 'danger'}
        />
        <MetricCard
          label="Цена рез. (Meta)"
          value={fmt(metaCpl, { style: 'currency' })}
          subtext={`${fmt(metaLeads, {})} результатов`}
        />
        <MetricCard
          label="CPL (BX)"
          value={fmt(cpl, { style: 'currency' })}
          subtext={`${fmt(bxLeads, {})} лидов в CRM`}
        />
        <MetricCard
          label="Конверсия в продажу"
          value={wonDeals > 0 && bxLeads > 0 ? `${((wonDeals / bxLeads) * 100).toFixed(1)}%` : '0%'}
          subtext={`${wonDeals} из ${bxLeads} лидов`}
        />
      </div>

      {/* Margin bar — строгая и компактная */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Маржинальность для расчета ROMI:
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            (доля чистой прибыли с каждой продажи)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            max="100"
            value={margin}
            onChange={e => onMarginChange(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-12 text-center text-xs font-semibold py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <span className="text-xs font-medium text-zinc-500">%</span>
        </div>
      </div>
    </div>
  )
}
