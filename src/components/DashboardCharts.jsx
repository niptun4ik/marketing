// components/DashboardCharts.jsx
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { useState } from 'react'
import FunnelEditor from './FunnelEditor'

const COLORS = {
  spend:     '#38bdf8',
  revenue:   '#34d399',
  metaLeads: '#f472b6',
  bxLeads:   '#818cf8',
  cpl:       '#fb923c',
}

const fmtK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v || 0))

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {p.dataKey === 'spend' || p.dataKey === 'revenue' || p.dataKey === 'cpl'
              ? `$${Number(p.value || 0).toFixed(2)}`
              : Number(p.value || 0).toLocaleString('ru-RU')}
          </span>
        </div>
      ))}
    </div>
  )
}

// --- График Расходы / Выручка по кампаниям ---
function SpendRevenueChart({ data }) {
  if (!data?.campaignData?.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Нет данных</div>
  )
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.campaignData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${fmtK(v)}`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Bar dataKey="spend"   name="Расходы" fill={COLORS.spend}   radius={[4,4,0,0]} maxBarSize={40} />
        <Bar dataKey="revenue" name="Выручка" fill={COLORS.revenue} radius={[4,4,0,0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- График по дням ---
const DAILY_METRICS = [
  { key: 'spend',     label: 'Расход ($)',    color: COLORS.spend,     type: 'bar'  },
  { key: 'metaLeads', label: 'Заявки (Meta)', color: COLORS.metaLeads, type: 'line' },
  { key: 'bxLeads',   label: 'Лиды BX',      color: COLORS.bxLeads,   type: 'line' },
  { key: 'cpl',       label: 'CPL ($)',       color: COLORS.cpl,       type: 'line' },
]

function DailyChart({ dailyData }) {
  const [metric, setMetric] = useState('spend')

  if (!dailyData?.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      Нет данных по дням.<br/>
      <span className="text-xs mt-1">Убедитесь что в Bitrix-файле есть колонка «Дата создания»</span>
    </div>
  )

  const m = DAILY_METRICS.find(d => d.key === metric)

  return (
    <div>
      {/* Metric switcher */}
      <div className="flex flex-wrap gap-1 mb-3">
        {DAILY_METRICS.map(d => (
          <button
            key={d.key}
            onClick={() => setMetric(d.key)}
            className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${metric === d.key ? 'text-white' : 'text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            style={metric === d.key ? { background: d.color } : {}}
          >
            {d.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {m?.type === 'bar' ? (
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${fmtK(v)}`} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={m.key} name={m.label} fill={m.color} radius={[3,3,0,0]} maxBarSize={30} />
          </BarChart>
        ) : (
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={{ r: 3, fill: m.color }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

// --- Воронка конверсии ---
function ConversionFunnel({ funnelData, bxDeals, session, stageOrder, onStageOrderChange }) {
  if (!funnelData?.length || funnelData[0]?.value === 0) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Нет данных</div>
  )

  const max = funnelData[0].value
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Воронка конверсии</h3>
      <div className="space-y-3">
        {funnelData.map((step, i) => {
          const pct = max > 0 ? (step.value / max) * 100 : 0
          const convPct = i > 0 && funnelData[i - 1].value > 0
            ? ((step.value / funnelData[i - 1].value) * 100).toFixed(1)
            : null
          return (
            <div key={step.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  {step.isBxStage && <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1 rounded text-gray-400">BX</span>}
                  {step.name}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {Number(step.value).toLocaleString('ru-RU')}
                  {convPct && <span className="ml-2 text-gray-400">({convPct}%)</span>}
                </span>
              </div>
              <div className="w-full h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                  style={{ width: `${Math.max(pct, 2)}%`, background: step.fill }}
                >
                  {pct > 20 && (
                    <span className="text-white text-[10px] font-bold">{pct.toFixed(0)}%</span>
                  )}
                </div>
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
  const [view, setView] = useState('campaigns') // 'campaigns' | 'daily'

  return (
    <div className="space-y-4">
      {/* Top: Spend/Revenue chart with view toggle */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {view === 'campaigns' ? 'Расходы vs Выручка по кампаниям' : 'Метрики по дням'}
          </h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {[
              { key: 'campaigns', label: 'По кампаниям' },
              { key: 'daily',     label: 'По дням' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${view === v.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
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

      {/* Bottom: Funnel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
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
