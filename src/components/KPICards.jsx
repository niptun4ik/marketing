// components/KPICards.jsx
import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Target, Zap, Percent } from 'lucide-react'

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

function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'blue', size = 'md' }) {
  const colorMap = {
    blue:   'bg-blue-50   dark:bg-blue-900/20   text-blue-500',
    green:  'bg-green-50  dark:bg-green-900/20  text-green-500',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500',
    red:    'bg-red-50    dark:bg-red-900/20    text-red-500',
    teal:   'bg-teal-50   dark:bg-teal-900/20   text-teal-500',
  }

  return (
    <div className="kpi-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon size={15} />
        </div>
      </div>
      <div>
        <p className={`font-bold text-gray-900 dark:text-gray-100 leading-none ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export default function KPICards({ totals, margin, onMarginChange }) {
  if (!totals) return null
  const { spend, revenue, roas, romi, cpl, metaCpl, wonDeals, bxLeads, metaLeads, impressions, clicks } = totals

  const roasPositive = roas >= 0
  const romiPositive = romi >= 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <KPICard
          title="Общий бюджет (Spend)"
          value={fmt(spend, { style: 'currency' })}
          subtitle={`${fmt(impressions, {})} показов`}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Выручка (Успешные)"
          value={fmt(revenue, { style: 'currency' })}
          subtitle={`${wonDeals} продаж`}
          icon={ShoppingCart}
          color="green"
          size="lg"
        />
        <KPICard
          title="ROAS"
          value={fmt(roas, { style: 'percent', decimals: 1 })}
          subtitle={roasPositive ? 'Прибыльно' : 'Убыточно'}
          icon={roasPositive ? TrendingUp : TrendingDown}
          color={roasPositive ? 'green' : 'red'}
        />
        <KPICard
          title="ROMI (с учётом маржи)"
          value={fmt(romi, { style: 'percent', decimals: 1 })}
          subtitle={romiPositive ? 'Выгодно' : 'Убыток'}
          icon={romiPositive ? TrendingUp : TrendingDown}
          color={romiPositive ? 'teal' : 'red'}
        />
        <KPICard
          title="Цена рез. (Meta)"
          value={fmt(metaCpl, { style: 'currency' })}
          subtitle={`${fmt(metaLeads, {})} результатов`}
          icon={Users}
          color="orange"
        />
        <KPICard
          title="Средний CPL (BX)"
          value={fmt(cpl, { style: 'currency' })}
          subtitle={`${fmt(bxLeads, {})} лидов BX`}
          icon={Target}
          color="purple"
        />
        <KPICard
          title="Продаж / Клики"
          value={fmt(wonDeals, {})}
          subtitle={`из ${fmt(clicks, {})} кликов`}
          icon={Zap}
          color="blue"
        />
      </div>

      {/* Margin input */}
      <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/40 rounded-xl px-4 py-2.5">
        <Percent size={14} className="text-teal-500 shrink-0" />
        <p className="text-xs text-teal-700 dark:text-teal-300 font-medium">Маржинальность для расчёта ROMI:</p>
        <input
          type="number"
          min="1" max="100"
          value={margin}
          onChange={e => onMarginChange(Math.max(1, Math.min(100, Number(e.target.value))))}
          className="w-16 text-center text-sm font-semibold border border-teal-200 dark:border-teal-800 rounded-lg py-1 bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <span className="text-xs text-teal-600 dark:text-teal-400">% — ваша чистая маржа с продажи</span>
      </div>
    </div>
  )
}
