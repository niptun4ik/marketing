// components/Dashboard.jsx
import { useMemo, useState, useEffect } from 'react'
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
import { supabase } from '../supabaseClient'

const DEFAULT_FILTERS = {
  search: '',
  dateFrom: '',
  dateTo: '',
  stages: ['Новая', 'В работе', 'Успешно', 'Проиграна'],
  hiddenCampaigns: [],
}

export default function Dashboard({ metaRows, bitrixRows, session }) {
  const [matchKey, setMatchKey] = useState('campaign')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [margin, setMargin] = useState(30)
  const [stageOrder, setStageOrder] = useState([])

  // Load funnel config from Supabase
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('funnel_config')
      .select('stage_order')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.stage_order?.length) setStageOrder(data.stage_order)
      })
  }, [session])

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
      if (filters.stages?.length && stage && !filters.stages.includes(stage)) {
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

  const allBxDeals = useMemo(() => filteredCampaigns.flatMap(c => c?.bxDeals || []), [filteredCampaigns])

  const chartData = useMemo(() => ({
    campaignData: buildCampaignChartData(filteredCampaigns),
    dailyData:    buildDailyChartData(filteredCampaigns),
  }), [filteredCampaigns])

  const funnelData = useMemo(
    () => buildFunnelData(totals, allBxDeals, stageOrder),
    [totals, allBxDeals, stageOrder]
  )

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Сводная аналитика маркетинга
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {metaRows.length} записей рекламных расходов · {bitrixRows.length} сделок в CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      <DashboardCharts
        chartData={chartData}
        funnelData={funnelData}
        bxDeals={allBxDeals}
        session={session}
        stageOrder={stageOrder}
        onStageOrderChange={setStageOrder}
      />

      {/* Table */}
      <AnalyticsTable 
        campaigns={filteredCampaigns} 
        totals={totals} 
        onHideCampaign={(name) => setFilters(f => ({ ...f, hiddenCampaigns: [...(f.hiddenCampaigns || []), name] }))}
        session={session}
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
