// components/DashboardCharts.jsx
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { useState } from 'react'
import FunnelEditor from './FunnelEditor'

// Сдержанные, элегантные цвета вместо "кислотных"
const COLORS = {
  spend:     '#71717a', // zinc-500
  revenue:   '#10b981', // emerald-500
  metaLeads: '#3b82f6', // blue-500
  bxLeads:   '#6366f1', // indigo-500
  cpl:       '#f59e0b', // amber-500
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
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
        <Bar yAxisId="spend" dataKey="spend"   name="Расход ($)"  fill={COLORS.spend}   radius={[3,3,0,0]} maxBarSize={24} />
        <Bar yAxisId="revenue" dataKey="revenue" name="Выручка (₸)" fill={COLORS.revenue} radius={[3,3,0,0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- График по дням ---
const DAILY_METRICS = [
  { key: 'spend',     label: 'Расход ($)',    color: COLORS.spend,     type: 'bar'  },
  { key: 'metaLeads', label: 'Заявки (Meta)', color: COLORS.metaLeads, type: 'line' },
  { key: 'bxLeads',   label: 'Лиды CRM',      color: COLORS.bxLeads,   type: 'line' },
  { key: 'cpl',       label: 'CPL ($)',       color: COLORS.cpl,       type: 'line' },
]

function DailyChart({ dailyData }) {
  const [metric, setMetric] = useState('spend')

  if (!dailyData?.length) return (
    <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">
      Нет данных по дням
    </div>
  )

  const m = DAILY_METRICS.find(d => d.key === metric)

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {DAILY_METRICS.map(d => (
          <button
            key={d.key}
            onClick={() => setMetric(d.key)}
            className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
              metric === d.key
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        {m?.type === 'bar' ? (
          <BarChart data={dailyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => (m.key === 'spend' || m.key === 'cpl') ? `$${fmtK(v)}` : fmtK(v)}
              tick={{ fontSize: 9, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={m.key} name={m.label} fill={m.color} radius={[3,3,0,0]} maxBarSize={24} />
          </BarChart>
        ) : (
          <LineChart data={dailyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" strokeOpacity={0.6} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => (m.key === 'spend' || m.key === 'cpl') ? `$${fmtK(v)}` : fmtK(v)}
              tick={{ fontSize: 9, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
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
