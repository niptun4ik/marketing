// components/Dashboard.jsx
import { useMemo, useState, useEffect } from 'react'
import KPICards from './KPICards'
import FiltersBar from './FiltersBar'
import DashboardCharts from './DashboardCharts'
import AnalyticsTable from './AnalyticsTable'
import ExportButton from './ExportButton'
import PlanFactPanel from './PlanFactPanel'
import DailyReportModal from './DailyReportModal'
import CRMTab from './CRMTab'
import InsightsStrip from './InsightsStrip'
import { FileText } from 'lucide-react'
import {
  matchAndAggregate,
  computeTotals,
  computeCampaignMetrics,
  buildCampaignChartData,
  buildDailyChartData,
  buildFunnelData,
  parseDateKey,
  extractMetaDateKey,
  extractMetaDateRange,
  extractBitrixDateKey,
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
  const [usdRate, setUsdRate] = useState(500)
  const [stageOrder, setStageOrder] = useState([])
  const [showDailyReport, setShowDailyReport] = useState(false)
  const [activeTab, setActiveTab] = useState('meta') // 'meta' | 'crm'

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

  // Фильтруем Meta по выбранному периоду дат (пересечение отрезков [start, end] и [dateFrom, dateTo])
  const filteredMeta = useMemo(() => {
    if (!filters.dateFrom && !filters.dateTo) return metaRows || []
    return (metaRows || []).filter((row) => {
      const range = extractMetaDateRange(row)
      if (!range?.start) return true
      const start = range.start
      const end = range.end || start
      if (filters.dateFrom && end < filters.dateFrom) return false
      if (filters.dateTo   && start > filters.dateTo) return false
      return true
    })
  }, [metaRows, filters.dateFrom, filters.dateTo])

  // Фильтруем Bitrix по дате (через точный русский/ISO парсер) и стадии
  const filteredBitrix = useMemo(() => {
    return (bitrixRows || []).filter((deal) => {
      const d = extractBitrixDateKey(deal)
      if (filters.dateFrom && d && d < filters.dateFrom) return false
      if (filters.dateTo   && d && d > filters.dateTo)   return false
      const stage = String(deal?.stage || '').trim()
      if (filters.stages?.length && stage && !filters.stages.includes(stage)) {
        const isCustomFile = !bitrixRows.some((d) => ['Новая', 'В работе', 'Успешно', 'Проиграна'].includes(String(d?.stage || '').trim()))
        if (!isCustomFile) return false
      }
      return true
    })
  }, [bitrixRows, filters])

  // Match + aggregate с учётом актуального курса $ и маржи
  const campaigns = useMemo(
    () => matchAndAggregate(filteredMeta, filteredBitrix, matchKey, usdRate, margin / 100),
    [filteredMeta, filteredBitrix, matchKey, usdRate, margin]
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
    return computeCampaignMetrics(aggTotals, allDeals, margin / 100, usdRate)
  }, [filteredCampaigns, margin, usdRate])

  const allBxDeals = useMemo(() => filteredCampaigns.flatMap(c => c?.bxDeals || []), [filteredCampaigns])

  const chartData = useMemo(() => ({
    campaignData: buildCampaignChartData(filteredCampaigns),
    dailyData:    buildDailyChartData(filteredCampaigns, filters.dateFrom, filters.dateTo),
  }), [filteredCampaigns, filters.dateFrom, filters.dateTo])

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
          {activeTab === 'meta' && (
            <>
              <button
                onClick={() => setShowDailyReport(true)}
                className="btn-secondary flex items-center gap-1.5"
                title="Сформировать готовый утренний отчет"
              >
                <FileText size={13} />
                <span>Отчет за день</span>
              </button>
              <ExportButton campaigns={filteredCampaigns} usdRate={usdRate} />
            </>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 w-fit">
        {[
          { key: 'meta', label: '📊 Meta Ads' },
          { key: 'crm',  label: '🗂 CRM / Bitrix' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      {activeTab === 'crm' ? (
        <CRMTab bitrixRows={bitrixRows} />
      ) : (
        <>
          {/* KPIs */}
          <KPICards
            totals={totals}
            margin={margin}
            onMarginChange={setMargin}
            usdRate={usdRate}
            onUsdRateChange={setUsdRate}
          />

          {/* Plan-Fact */}
          <PlanFactPanel totals={totals} />

          {/* Quick Insights & Anomalies (Linear Style) */}
          <InsightsStrip campaigns={filteredCampaigns} totals={totals} usdRate={usdRate} />

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
        </>
      )}

      {/* Daily Report Modal */}
      <DailyReportModal
        isOpen={showDailyReport}
        onClose={() => setShowDailyReport(false)}
        metaRows={metaRows}
        bitrixRows={allBxDeals}
        campaigns={filteredCampaigns}
        totals={totals}
        usdRate={usdRate}
        hiddenCampaigns={filters.hiddenCampaigns || []}
      />
    </div>
  )
}
