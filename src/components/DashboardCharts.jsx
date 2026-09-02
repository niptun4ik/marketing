// components/DashboardCharts.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, FunnelChart as RechartsFunnel, Funnel, LabelList,
} from 'recharts'
import { useState } from 'react'

const COLORS = {
  spend:   '#38bdf8',
  revenue: '#34d399',
  deals:   '#818cf8',
}

const fmtRUB = (v) => v >= 1000000
  ? `${(v / 1000000).toFixed(1)}M`
  : v >= 1000
  ? `${(v / 1000).toFixed(0)}K`
  : String(v)

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2 max-w-[200px] break-words">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {p.value.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      ))}
    </div>
  )
}

function SpendRevenueChart({ data }) {
  const [groupBy, setGroupBy] = useState('campaign')
  const chartData = groupBy === 'campaign' ? data.campaignData : data.dailyData

  if (!chartData?.length) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Нет данных для графика</div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Расходы vs Выручка</h3>
        <div className="flex gap-1">
          {['campaign', 'daily'].map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${groupBy === g ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              {g === 'campaign' ? 'По кампаниям' : 'По дням'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey={groupBy === 'campaign' ? 'name' : 'date'}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tickFormatter={fmtRUB} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={45} />
          <Tooltip content={<CustomTooltipBar />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
          <Bar dataKey="spend"   name="Расходы"  fill={COLORS.spend}   radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="revenue" name="Выручка"  fill={COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const CustomFunnelTooltip = ({ active, payload }) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200">{d.name}</p>
      <p className="text-gray-500 mt-1">{Number(d.value).toLocaleString('ru-RU')}</p>
    </div>
  )
}

function ConversionFunnel({ funnelData }) {
  if (!funnelData?.length || funnelData[0].value === 0) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Нет данных</div>
  )

  // Самодельная воронка (Recharts FunnelChart капризничает) — красивые бары
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
                <span className="text-gray-600 dark:text-gray-400">{step.name}</span>
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
    </div>
  )
}

export default function DashboardCharts({ chartData, funnelData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <SpendRevenueChart data={chartData} />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <ConversionFunnel funnelData={funnelData} />
      </div>
    </div>
  )
}
