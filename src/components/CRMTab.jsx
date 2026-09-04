// components/CRMTab.jsx — CRM аналитика Bitrix24: по каналам, стадиям, дням
import { useMemo } from 'react'
import { toNum, isWonStage } from '../utils/matchData'
import { parseDateKey } from './DailyReportModal'

function detectChannel(deal) {
  const src      = String(deal?.utm_source || '').toLowerCase()
  const form     = String(deal?.formname || '').toLowerCase()
  const dealName = String(deal?.deal_name || '').toLowerCase()
  const utmCamp  = String(deal?.utm_campaign || '').toLowerCase()
  if (src.includes('whatsapp') || src.includes('wazzup')) return 'WhatsApp'
  if (form || dealName.includes('форма') || dealName.includes('сайт')) return 'Сайт / Лендинг'
  if (src === 'таргет' || src === 'facebook' || src === 'instagram' || utmCamp) return 'Таргет (прямой)'
  if (src.includes('партнер')) return 'Партнёры'
  return 'Другое / Органика'
}

const CH = {
  'Сайт / Лендинг':   { bg: 'bg-blue-50 dark:bg-blue-900/20',      pill: 'bg-blue-100 text-blue-700',       bar: 'bg-blue-500'    },
  'WhatsApp':         { bg: 'bg-emerald-50 dark:bg-emerald-900/20', pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  'Таргет (прямой)': { bg: 'bg-violet-50 dark:bg-violet-900/20',   pill: 'bg-violet-100 text-violet-700',   bar: 'bg-violet-500'  },
  'Партнёры':        { bg: 'bg-amber-50 dark:bg-amber-900/20',     pill: 'bg-amber-100 text-amber-700',     bar: 'bg-amber-500'   },
  'Другое / Органика':{ bg: 'bg-zinc-50 dark:bg-zinc-800/40',      pill: 'bg-zinc-100 text-zinc-600',       bar: 'bg-zinc-400'    },
}

const fmt = (n) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 })
const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) : '0'

function ChannelCard({ channel, data, maxDeals }) {
  const m = CH[channel] || CH['Другое / Органика']
  return (
    <div className={`rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 p-4 ${m.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1.5 ${m.pill}`}>{channel}</span>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.total}</div>
          <div className="text-[11px] text-zinc-400">сделок</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data.won}</div>
          <div className="text-[11px] text-zinc-400">оплат</div>
          <div className="text-[11px] font-medium text-emerald-600 mt-1">{pct(data.won, data.total)}% CR</div>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-200/60 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${maxDeals > 0 ? (data.total / maxDeals) * 100 : 0}%` }} />
      </div>
      <div className="space-y-1">
        {Object.entries(data.stages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([stage, count]) => (
          <div key={stage} className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">{stage}</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{count}</span>
          </div>
        ))}
      </div>
      {data.revenue > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Выручка</span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmt(data.revenue)} ₸</span>
        </div>
      )}
    </div>
  )
}

function Sparkline({ byDay }) {
  const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
  if (days.length < 2) return null
  const maxVal = Math.max(...days.map(([, v]) => v.total), 1)
  const W = 300, H = 44, pad = 3
  const pts = days.map(([, v], i) => {
    const x = (pad + (i / (days.length - 1)) * (W - 2 * pad)).toFixed(1)
    const y = (H - pad - ((v.total / maxVal) * (H - 2 * pad))).toFixed(1)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg className="w-full" viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {days.map(([dk, v], i) => {
        const x = (pad + (i / (days.length - 1)) * (W - 2 * pad)).toFixed(1)
        const y = (H - pad - ((v.total / maxVal) * (H - 2 * pad))).toFixed(1)
        return <circle key={dk} cx={x} cy={y} r="2.5" fill="#3b82f6" />
      })}
    </svg>
  )
}

export default function CRMTab({ bitrixRows = [] }) {
  const data = useMemo(() => {
    const channels = {}, byDay = {}, allStages = {}
    let totalRevenue = 0, totalWon = 0

    for (const deal of bitrixRows) {
      const ch = detectChannel(deal)
      if (!channels[ch]) channels[ch] = { total: 0, won: 0, revenue: 0, stages: {} }
      channels[ch].total++
      const stage = String(deal?.stage || '').trim() || 'Неизвестно'
      channels[ch].stages[stage] = (channels[ch].stages[stage] || 0) + 1
      allStages[stage] = (allStages[stage] || 0) + 1
      if (isWonStage(stage)) {
        channels[ch].won++
        const rev = toNum(deal?.amount)
        channels[ch].revenue += rev; totalRevenue += rev; totalWon++
      }
      const dk = parseDateKey(deal?.created_date)
      if (dk) {
        if (!byDay[dk]) byDay[dk] = { total: 0, won: 0 }
        byDay[dk].total++
        if (isWonStage(stage)) byDay[dk].won++
      }
    }
    return { channels, byDay, allStages, totalRevenue, totalWon, total: bitrixRows.length }
  }, [bitrixRows])

  const maxDeals = Math.max(...Object.values(data.channels).map(c => c.total), 1)
  const sortedChannels = Object.entries(data.channels).sort((a, b) => b[1].total - a[1].total)
  const sortedDays = Object.entries(data.byDay).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14)

  if (!bitrixRows.length) return (
    <div className="max-w-screen-2xl mx-auto px-4 py-16 text-center text-zinc-400 text-sm">
      Загрузите файл выгрузки Bitrix24 для CRM аналитики
    </div>
  )

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-fade-in">

      {/* KPI строка */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего сделок',  value: data.total,    sub: 'в Bitrix CRM' },
          { label: 'Оплат',         value: data.totalWon, sub: `${pct(data.totalWon, data.total)}% конверсия` },
          { label: 'Выручка',       value: `${fmt(data.totalRevenue)} ₸`, sub: 'из оплаченных' },
          { label: 'Средний чек',   value: data.totalWon > 0 ? `${fmt(data.totalRevenue / data.totalWon)} ₸` : '—', sub: 'по оплатам' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 p-4">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{item.value}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Каналы */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">По каналам привлечения</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedChannels.map(([ch, d]) => (
              <ChannelCard key={ch} channel={ch} data={d} maxDeals={maxDeals} />
            ))}
          </div>
        </div>

        {/* Воронка + динамика */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 p-4">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Воронка по стадиям</p>
            <div className="space-y-2">
              {Object.entries(data.allStages).sort((a, b) => b[1] - a[1]).map(([stage, count]) => {
                const p = pct(count, data.total)
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">{stage}</span>
                      <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                        {count} <span className="text-zinc-400">({p}%)</span>
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 p-4">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Динамика лидов по дням</p>
            <Sparkline byDay={data.byDay} />
            <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {sortedDays.map(([dk, d]) => {
                const [y, m, dd] = dk.split('-')
                return (
                  <div key={dk} className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 tabular-nums">{dd}.{m}.{y}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-700 dark:text-zinc-300">{d.total} лид.</span>
                      {d.won > 0 && <span className="text-emerald-600 font-medium">{d.won} ✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp notice */}
      {data.channels['WhatsApp'] && (
        <div className="flex gap-3 p-3.5 rounded-xl border border-amber-200/60 bg-amber-50/60 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-300">
          <span className="shrink-0">⚠️</span>
          <span>
            <strong>WhatsApp сделки ({data.channels['WhatsApp'].total} шт.)</strong> — Click-to-WhatsApp реклама не передаёт UTM, поэтому эти сделки нельзя автоматически привязать к конкретной Meta кампании. Могут быть органикой или результатом WA-кампаний (напр. «Бизнес Семинар | Ватсап»).
          </span>
        </div>
      )}
    </div>
  )
}

