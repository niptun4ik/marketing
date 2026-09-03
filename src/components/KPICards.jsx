// components/KPICards.jsx
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Target, Zap } from 'lucide-react'

const fmt = (n, opts = {}) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const { style, currency, decimals = 0, suffix = '' } = opts
  if (style === 'currency') {
    return n.toLocaleString('ru-RU', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 })
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

export default function KPICards({ totals }) {
  if (!totals) return null
  const { spend, revenue, roas, cpl, wonDeals, bxLeads, impressions, clicks } = totals

  const roasPositive = roas >= 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
        title="ROAS / ROMI"
        value={fmt(roas, { style: 'percent', decimals: 1 })}
        subtitle={roasPositive ? 'Прибыльно' : 'Убыточно'}
        icon={roasPositive ? TrendingUp : TrendingDown}
        color={roasPositive ? 'green' : 'red'}
      />
      <KPICard
        title="Средний CPL"
        value={fmt(cpl, { style: 'currency' })}
        subtitle={`${bxLeads} лидов BX`}
        icon={Target}
        color="purple"
      />
      <KPICard
        title="Продаж / Клики"
        value={fmt(wonDeals, {})}
        subtitle={`из ${fmt(clicks, {})} кликов`}
        icon={Zap}
        color="orange"
      />
    </div>
  )
}
