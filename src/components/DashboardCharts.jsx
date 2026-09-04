import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { useState } from 'react'
import { Info } from 'lucide-react'
import FunnelEditor from './FunnelEditor'

// Сдержанные, элегантные цвета
const COLORS = {
  spend:     '#71717a', // zinc-500
  revenue:   '#10b981', // emerald-500
  metaLeads: '#3b82f6', // blue-500
  bxLeads:   '#6366f1', // indigo-500
  cpl:       '#f59e0b', // amber-500
  clicks:    '#0284c7', // sky-600
}

const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_RU_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

const formatRuTick = (raw) => {
  if (!raw) return ''
  const parts = String(raw).split('-')
  if (parts.length === 3) {
    const [, m, d] = parts
    const mIdx = parseInt(m, 10) - 1
    return `${parseInt(d, 10)} ${MONTHS_RU_SHORT[mIdx] || m}`
  }
  return raw
}

const formatRuFullDate = (raw) => {
  if (!raw) return ''
  const parts = String(raw).split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    const mIdx = parseInt(m, 10) - 1
    return `${parseInt(d, 10)} ${MONTHS_RU_FULL[mIdx] || m} ${y} г.`
  }
  return raw
}

const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v || 0))

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-md p-2.5 text-xs">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            <span className="text-zinc-500 dark:text-zinc-400">{p.name}:</span>
          </div>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
            {p.dataKey === 'revenue'
              ? `${Number(p.value || 0).toLocaleString('ru-RU')} ₸`
              : p.dataKey === 'spend' || p.dataKey === 'cpl'
              ? `$${Number(p.value || 0).toFixed(2)}`
              : Number(p.value || 0).toLocaleString('ru-RU')}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Детальная плавающая карточка для графика по дням */
const DailyTooltip = ({ active, payload, activeMetric }) => {
  if (!active || !payload?.length) return null
  const day = payload[0]?.payload
  if (!day) return null

  const dateFormatted = formatRuFullDate(day.date)
  const isCrmOnly = day.spend === 0 && day.bxLeads > 0
  const isMetaOnly = day.spend > 0 && day.bxLeads === 0
  const isBoth = day.spend > 0 && day.bxLeads > 0

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs min-w-[260px] space-y-2 pointer-events-none select-none">
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-1.5 flex items-center justify-between gap-2">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{dateFormatted}</span>
        {isBoth ? (
          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 px-1.5 py-0.5 rounded font-medium">
            Meta + CRM
          </span>
        ) : isMetaOnly ? (
          <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 px-1.5 py-0.5 rounded font-medium">
            Meta Ads
          </span>
        ) : (
          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 px-1.5 py-0.5 rounded font-medium">
            Лиды CRM
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-[11px]">
        {/* Расход Meta */}
        <div className={`flex justify-between items-center py-0.5 px-1.5 rounded ${(activeMetric === 'spend' || activeMetric === 'combined') ? 'bg-zinc-100 dark:bg-zinc-800/80 font-medium' : ''}`}>
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.spend }} />
            Расход Meta {day.isDistributed ? '(распред.)*' : 'за день'}:
          </span>
          <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">
            {day.spend > 0 ? `$${Number(day.spend).toFixed(2)}` : '$0.00'}
          </span>
        </div>

        {/* Клики и Показы Meta */}
        {(day.clicks > 0 || day.impressions > 0) && (
          <div className="flex justify-between items-center py-0.5 px-1.5 text-zinc-400 text-[10px]">
            <span>Клики / Показы:</span>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {day.clicks || 0} кл. / {day.impressions || 0} пок.
            </span>
          </div>
        )}

        {/* Лиды CRM */}
        <div className={`flex justify-between items-center py-0.5 px-1.5 rounded ${(activeMetric === 'bxLeads' || activeMetric === 'combined') ? 'bg-indigo-50/70 dark:bg-indigo-950/30 font-medium' : ''}`}>
          <span className="text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.bxLeads }} />
            Лиды Bitrix24 (CRM):
          </span>
          <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {Number(day.bxLeads || 0).toLocaleString('ru-RU')}
          </span>
        </div>

        {/* Заявки Meta */}
        <div className={`flex justify-between items-center py-0.5 px-1.5 rounded ${activeMetric === 'metaLeads' ? 'bg-zinc-100 dark:bg-zinc-800/80 font-medium' : ''}`}>
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.metaLeads }} />
            Заявки Meta:
          </span>
          <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">
            {day.hasDailyMeta || day.hasDailyMetaBreakdown
              ? Math.round(day.metaLeads || 0)
              : (
                <span className="text-zinc-400 font-normal text-[10px]">
                  — (нет разбивки в Meta)
                </span>
              )}
          </span>
        </div>

        {/* Оплаты и Выручка CRM */}
        <div className={`flex justify-between items-center py-0.5 px-1.5 rounded ${(activeMetric === 'wonDeals' || activeMetric === 'revenue' || activeMetric === 'combined') ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-medium' : ''}`}>
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.revenue }} />
            Выручка / Оплаты:
          </span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {day.wonDeals || 0} шт. {day.revenue > 0 ? `(${Number(day.revenue).toLocaleString('ru-RU')} ₸)` : ''}
          </span>
        </div>

        {/* CPL */}
        <div className={`flex justify-between items-center pt-1 border-t border-zinc-100 dark:border-zinc-800 px-1.5 ${activeMetric === 'cpl' ? 'bg-amber-50/60 dark:bg-amber-950/20 rounded font-medium' : ''}`}>
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.cpl }} />
            CPL (цена лида):
          </span>
          <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
            {day.cpl != null ? `$${Number(day.cpl).toFixed(2)}` : (isCrmOnly ? 'Органический / без расхода' : '—')}
          </span>
        </div>

        {/* Список активных кампаний за этот день */}
        {day.activeCampaigns?.length > 0 && (
          <div className="pt-1 text-[9px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60 truncate" title={day.activeCampaigns.join(', ')}>
            Кампании: {day.activeCampaigns.slice(0, 2).join(', ')}{day.activeCampaigns.length > 2 ? ` (+еще ${day.activeCampaigns.length - 2})` : ''}
          </div>
        )}

        {/* Сноска о распределении */}
        {day.isDistributed && (
          <div className="pt-0.5 text-[9px] text-zinc-400 italic">
            * Отчёт Meta выгружен за период: расход распределён равномерно по активным дням кампании.
          </div>
        )}
        {!day.hasDailyMeta && !day.hasDailyMetaBreakdown && (day.totalCampaignLeads > 0 || day.totalMetaLeads > 0) && (
          <div className="pt-0.5 text-[9px] text-zinc-400 italic">
            * В выгрузке Meta нет разбивки по дням (всего {day.totalCampaignLeads || day.totalMetaLeads} за период). Точные даты лидов зафиксированы в строке CRM.
          </div>
        )}
      </div>
    </div>
  )
}

// --- График Расходы / Выручка по кампаниям ---
function SpendRevenueChart({ data }) {
  if (!data?.campaignData?.length) return (
    <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">Нет данных для графика</div>
  )
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data.campaignData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="spend" tickFormatter={v => `$${fmtK(v)}`} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={45} />
        <YAxis yAxisId="revenue" orientation="right" tickFormatter={v => `${fmtK(v)}₸`} tick={{ fontSize: 10, fill: '#10b981' }} axisLine={false} tickLine={false} width={45} />
        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        <Bar yAxisId="spend" dataKey="spend"   name="Расход ($)"  fill={COLORS.spend}   radius={[3,3,0,0]} maxBarSize={24} />
        <Bar yAxisId="revenue" dataKey="revenue" name="Выручка (₸)" fill={COLORS.revenue} radius={[3,3,0,0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- График по дням ---
const DAILY_METRICS = [
  { key: 'combined',  label: '⚡ Сводный (Расход + Лиды)', color: '#8b5cf6', type: 'combined' },
  { key: 'spend',     label: 'Расход ($)',                 color: COLORS.spend,     type: 'bar'  },
  { key: 'bxLeads',   label: 'Лиды CRM',                   color: COLORS.bxLeads,   type: 'line' },
  { key: 'revenue',   label: 'Выручка (₸)',               color: COLORS.revenue,   type: 'bar'  },
  { key: 'metaLeads', label: 'Заявки (Meta)',              color: COLORS.metaLeads, type: 'line' },
  { key: 'wonDeals',  label: 'Оплаты (CRM)',               color: '#059669',        type: 'bar'  },
  { key: 'cpl',       label: 'CPL ($)',                    color: COLORS.cpl,       type: 'line' },
  { key: 'clicks',    label: 'Клики',                      color: COLORS.clicks,    type: 'bar'  },
]

function DailyChart({ dailyData }) {
  const [metric, setMetric] = useState('combined')

  if (!dailyData?.length) return (
    <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
      Нет данных по дням
    </div>
  )

  const metaSummary = dailyData[0] || {}
  const totalMetaSpend = metaSummary.periodSpend ?? metaSummary.totalMetaSpend ?? 0
  const totalBxLeads = metaSummary.periodBxLeads ?? metaSummary.totalBxLeads ?? 0
  const totalRevenue = metaSummary.periodRevenue ?? metaSummary.totalRevenue ?? 0
  const totalMetaLeads = metaSummary.periodMetaLeads ?? metaSummary.totalMetaLeads ?? 0
  const overallCpl = metaSummary.periodCpl ?? (totalBxLeads > 0 && totalMetaSpend > 0 ? (totalMetaSpend / totalBxLeads).toFixed(2) : null)
  const hasAnySpend = (dailyData || []).some(d => d.spend > 0)
  const hasAnyRevenue = (dailyData || []).some(d => d.revenue > 0)
  const hasAnyWon = (dailyData || []).some(d => d.wonDeals > 0)
  const hasAnyCpl = (dailyData || []).some(d => d.cpl != null)
  const m = DAILY_METRICS.find(d => d.key === metric)

  return (
    <div>
      {/* Сводный KPI-стрип по дням */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 block font-medium">Расход рекламы:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">${totalMetaSpend}</span>
            {metaSummary?.isAnyDistributed && (
              <span className="text-[9px] text-zinc-400 font-normal">(${metaSummary?.avgSpendPerDay}/д)</span>
            )}
          </div>
          {metaSummary?.totalCampaignSpend > totalMetaSpend && (
            <span className="text-[9px] text-zinc-400 block mt-0.5">
              из ${metaSummary.totalCampaignSpend} за всю кампанию
            </span>
          )}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 block font-medium">Лиды в CRM:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{totalBxLeads}</span>
            <span className="text-[9px] text-zinc-400 font-normal">сделок</span>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 block font-medium">Выручка (CRM):</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {totalRevenue.toLocaleString('ru-RU')} ₸
            </span>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60">
          <span className="text-[10px] text-zinc-400 block font-medium">Средний CPL:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
              {overallCpl ? `$${overallCpl}` : '—'}
            </span>
            <span className="text-[9px] text-zinc-400 font-normal">/ сделку</span>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-zinc-400 block font-medium">Пик активности:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
              {metaSummary?.peakDay ? `${formatRuTick(metaSummary.peakDay.date)} (${metaSummary.peakDay.leads} л.)` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Кнопки метрик */}
      <div className="flex flex-wrap gap-1 mb-3">
        {DAILY_METRICS.map(d => (
          <button
            key={d.key}
            onClick={() => setMetric(d.key)}
            className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
              metric === d.key
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* График */}
      {metric === 'spend' && !hasAnySpend ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">В выгрузке Meta Ads нет посуточной разбивки расходов</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
            Рекламные расходы экспортированы общей суммой за весь период ({totalMetaSpend > 0 ? `$${totalMetaSpend.toFixed(2)}` : 'кампании'}). Для анализа динамики по дням рекомендуем смотреть метрику «Лиды CRM» или переключиться на «Сводный».
          </p>
          <button
            onClick={() => setMetric('bxLeads')}
            className="text-[11px] font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1 rounded-md hover:opacity-90 transition-opacity"
          >
            Показать динамику лидов CRM ({totalBxLeads})
          </button>
        </div>
      ) : metric === 'metaLeads' && !metaSummary?.hasDailyMetaBreakdown ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">В выгрузке Meta Ads нет посуточной разбивки заявок</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
            Отчет Meta экспортирован общей строкой за период ({totalMetaSpend > 0 ? `$${totalMetaSpend.toFixed(2)}` : ''}, {totalMetaLeads} заявок). В Ads Manager не была выбрана опция «Разбивка по дням».
            Фактические даты каждого лида с точным временем зафиксированы в Bitrix24 (<strong>{totalBxLeads} лидов</strong>).
          </p>
          <button
            onClick={() => setMetric('bxLeads')}
            className="text-[11px] font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Показать фактическую динамику лидов из CRM ({totalBxLeads})
          </button>
        </div>
      ) : metric === 'revenue' && !hasAnyRevenue ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Нет оплаченных сделок за выбранный период</p>
          <p className="text-[11px] text-zinc-400 max-w-sm">
            В выгрузке Bitrix24 нет сделок на стадии «Успешно» с положительной суммой за эти даты.
          </p>
        </div>
      ) : metric === 'cpl' && !hasAnyCpl ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-400 text-xs text-center p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="font-medium text-zinc-600 dark:text-zinc-300 mb-1">Нет посуточных данных по CPL</p>
          <p className="text-[11px] text-zinc-400 max-w-sm">
            Посуточный CPL рассчитывается для дней, где одновременно зафиксированы расходы рекламы и заявки.
          </p>
        </div>
      ) : metric === 'combined' ? (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatRuTick} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="spend" orientation="left" tickFormatter={v => `$${fmtK(v)}`} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} width={42} />
            <YAxis yAxisId="leads" orientation="right" tickFormatter={v => fmtK(v)} tick={{ fontSize: 9, fill: '#6366f1' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<DailyTooltip activeMetric={metric} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar yAxisId="spend" dataKey="spend" name="Расход ($)" fill={COLORS.spend} radius={[3,3,0,0]} maxBarSize={20} />
            <Line yAxisId="leads" type="monotone" dataKey="bxLeads" name="Лиды CRM" stroke={COLORS.bxLeads} strokeWidth={2} dot={{ r: 2.5, fill: COLORS.bxLeads }} activeDot={{ r: 4 }} />
            {hasAnyWon && (
              <Line yAxisId="leads" type="monotone" dataKey="wonDeals" name="Оплаты (CRM)" stroke={COLORS.revenue} strokeWidth={2} dot={{ r: 3, fill: COLORS.revenue }} activeDot={{ r: 4 }} />
            )}
            {metaSummary?.hasDailyMetaBreakdown && (
              <Line yAxisId="leads" type="monotone" dataKey="metaLeads" name="Заявки Meta" stroke={COLORS.metaLeads} strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          {m?.type === 'bar' ? (
            <BarChart data={dailyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatRuTick} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => m.key === 'spend' ? `$${fmtK(v)}` : m.key === 'revenue' ? `${fmtK(v)}₸` : fmtK(v)}
                tick={{ fontSize: 9, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={m.key === 'revenue' ? 55 : 45}
              />
              <Tooltip content={<DailyTooltip activeMetric={metric} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 100, pointerEvents: 'none', outline: 'none' }} />
              <Bar dataKey={m.key} name={m.label} fill={m.color} radius={[3,3,0,0]} maxBarSize={24} />
            </BarChart>
          ) : (
            <LineChart data={dailyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatRuTick} tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => m.key === 'cpl' ? `$${fmtK(v)}` : fmtK(v)}
                tick={{ fontSize: 9, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<DailyTooltip activeMetric={metric} />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 100, pointerEvents: 'none', outline: 'none' }} />
              <Line
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: m.color }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Поясняющая плашка о логике графика */}
      <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400">
        <Info size={13} className="shrink-0 mt-0.5 text-zinc-400" />
        <span>
          {metaSummary?.isAnyDistributed ? (
            <>
              <strong>Логика данных:</strong> в выгрузке Meta Ads расходы указаны общим итогом за период ({metaSummary.totalMetaSpend > 0 ? `$${metaSummary.totalMetaSpend}` : ''}, {metaSummary.totalMetaLeads} заявок). Фактические даты поступления каждого лида взяты из CRM Bitrix24 ({metaSummary.totalBxLeads} сделок). Среднесуточный ориентир расхода рассчитан по активным дням кампании (${metaSummary.avgSpendPerDay}/день).
            </>
          ) : (
            <>
              <strong>Посуточная аналитика:</strong> отображает точный фактический расход рекламы и количество созданных сделок в CRM за каждый календарный день.
            </>
          )}
        </span>
      </div>
    </div>
  )
}

// --- Воронка конверсии: профессиональный ступенчатый вид ---
function ConversionFunnel({ funnelData, bxDeals, session, stageOrder, onStageOrderChange }) {
  if (!funnelData?.length || funnelData[0]?.value === 0) return (
    <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">Нет данных</div>
  )

  const max = funnelData[0].value
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
          Воронка конверсии
        </h3>
        <span className="text-[10px] text-zinc-400 font-medium">От показов до результата</span>
      </div>
      <div className="space-y-2">
        {funnelData.map((step, i) => {
          const pct = max > 0 ? (step.value / max) * 100 : 0
          const convPct = i > 0 && funnelData[i - 1].value > 0
            ? ((step.value / funnelData[i - 1].value) * 100).toFixed(1)
            : null
          return (
            <div key={step.name} className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px] flex items-center gap-1 font-medium">
                  {step.isBxStage && (
                    <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1 py-0.2 rounded">CRM</span>
                  )}
                  {step.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px] font-mono">
                    {Number(step.value).toLocaleString('ru-RU')}
                  </span>
                  {convPct && (
                    <span className="text-[10px] text-zinc-400 font-medium">
                      (CR: {convPct}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-zinc-800 dark:bg-zinc-200"
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <FunnelEditor
        bxDeals={bxDeals}
        session={session}
        stageOrder={stageOrder}
        onStageOrderChange={onStageOrderChange}
      />
    </div>
  )
}

export default function DashboardCharts({ chartData, funnelData, bxDeals, session, stageOrder, onStageOrderChange }) {
  const [view, setView] = useState('campaigns')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* 2/3: Primary Charts */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
            {view === 'campaigns' ? 'Расходы vs Выручка по кампаниям' : 'Динамика по дням'}
          </h3>
          <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md">
            {[
              { key: 'campaigns', label: 'По кампаниям' },
              { key: 'daily',     label: 'По дням' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`text-[11px] px-2.5 py-1 rounded transition-all ${
                  view === v.key
                    ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        {view === 'campaigns'
          ? <SpendRevenueChart data={chartData} />
          : <DailyChart dailyData={chartData?.dailyData} />
        }
      </div>

      {/* 1/3: Funnel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
        <ConversionFunnel
          funnelData={funnelData}
          bxDeals={bxDeals}
          session={session}
          stageOrder={stageOrder}
          onStageOrderChange={onStageOrderChange}
        />
      </div>
    </div>
  )
}
