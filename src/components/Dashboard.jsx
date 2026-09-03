// components/Dashboard.jsx
import { useMemo, useState } from 'react'
import KPICards from './KPICards'
import FiltersBar from './FiltersBar'
import DashboardCharts from './DashboardCharts'
import AnalyticsTable from './AnalyticsTable'
import ExportButton from './ExportButton'
import PlanFactPanel from './PlanFactPanel'
import {
  matchAndAggregate,
  computeTotals,
  computeCampaignMetrics,
  buildCampaignChartData,
  buildDailyChartData,
  buildFunnelData,
} from '../utils/matchData'
import { Link2, Link } from 'lucide-react'

const DEFAULT_FILTERS = {
  search: '',
  dateFrom: '',
  dateTo: '',
  stages: ['Новая', 'В работе', 'Успешно', 'Проиграна'],
  hiddenCampaigns: [],
}

export default function Dashboard({ metaRows, bitrixRows }) {
  const [matchKey, setMatchKey] = useState('campaign')  // 'campaign' | 'ad'
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [margin, setMargin] = useState(30)  // маржинальность в %

  // Filter Bitrix rows by date and stage
  const filteredBitrix = useMemo(() => {
    return (bitrixRows || []).filter((deal) => {
      let date = ''
      if (typeof deal?.created_date === 'string') {
        date = deal.created_date.split('T')[0]
      } else if (deal?.created_date instanceof Date) {
        date = deal.created_date.toISOString().split('T')[0]
      } else if (deal?.created_date) {
        date = String(deal.created_date).slice(0, 10)
      }

      if (filters.dateFrom && date && date < filters.dateFrom) return false
      if (filters.dateTo   && date && date > filters.dateTo)   return false
      const stage = String(deal?.stage || '').trim()
      // Фильтруем по стадии, только если пользователь явно выбрал стадии и стадия не пустая
      if (filters.stages?.length && stage && !filters.stages.includes(stage)) {
        // Если в фильтре только дефолтные стадии, а в файле другие — не отсекаем всё подряд
        const isCustomFile = !bitrixRows.some((d) => ['Новая', 'В работе', 'Успешно', 'Проиграна'].includes(String(d?.stage || '').trim()))
        if (!isCustomFile) return false
      }
      return true
    })
  }, [bitrixRows, filters])

  // Match + aggregate
  const campaigns = useMemo(
    () => matchAndAggregate(metaRows, filteredBitrix, matchKey),
    [metaRows, filteredBitrix, matchKey]
  )

  // Search filter on campaign level
  const filteredCampaigns = useMemo(() => {
    let res = campaigns
    if (filters.hiddenCampaigns?.length) {
      res = res.filter((c) => !filters.hiddenCampaigns.includes(c.campaign_name))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      res = res.filter((c) => c.campaign_name.toLowerCase().includes(q))
    }
    return res
  }, [campaigns, filters.search, filters.hiddenCampaigns])

  const totals = useMemo(() => {
    // Пересчитываем с учётом маржинальности для ROMI
    const allDeals = filteredCampaigns.flatMap(c => c?.bxDeals || [])
    const aggTotals = filteredCampaigns.reduce(
      (acc, c) => ({
        spend:       acc.spend + (c?.totals?.spend || 0),
        impressions: acc.impressions + (c?.totals?.impressions || 0),
        clicks:      acc.clicks + (c?.totals?.clicks || 0),
        leads:       acc.leads + (c?.totals?.leads || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, leads: 0 }
    )
    return computeCampaignMetrics(aggTotals, allDeals, margin / 100)
  }, [filteredCampaigns, margin])

  const chartData = useMemo(() => ({
    campaignData: buildCampaignChartData(filteredCampaigns),
    dailyData:    buildDailyChartData(filteredCampaigns),
  }), [filteredCampaigns])

  const funnelData = useMemo(() => buildFunnelData(totals), [totals])

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Сводная аналитика</h2>
          <p className="text-xs text-gray-400">
            {metaRows.length} строк Meta · {bitrixRows.length} сделок Bitrix24
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Match key toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setMatchKey('campaign')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                matchKey === 'campaign'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Link2 size={12} /> По кампании
            </button>
            <button
              onClick={() => setMatchKey('ad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                matchKey === 'ad'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Link size={12} /> По объявлению
            </button>
          </div>
          <ExportButton campaigns={filteredCampaigns} />
        </div>
      </div>

      {/* KPIs */}
      <KPICards totals={totals} margin={margin} onMarginChange={setMargin} />

      {/* Plan-Fact */}
      <PlanFactPanel totals={totals} />

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* Charts */}
      <DashboardCharts chartData={chartData} funnelData={funnelData} />

      {/* Table */}
      <AnalyticsTable 
        campaigns={filteredCampaigns} 
        totals={totals} 
        onHideCampaign={(name) => setFilters(f => ({ ...f, hiddenCampaigns: [...(f.hiddenCampaigns || []), name] }))}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40" />
          ROAS ≥ 100%
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/40" />
          Spend &gt; 0, Продаж = 0 или убыток
        </div>
      </div>
    </div>
  )
}
