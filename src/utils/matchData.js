// utils/matchData.js
// Объединение данных Meta Ads и Bitrix24 по ключу кампании

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Матчинг Meta-строки с Bitrix-строками.
 * @param {object[]} metaRows    - строки из Meta Ads (после маппинга)
 * @param {object[]} bitrixRows  - строки из Bitrix24 (после маппинга)
 * @param {'campaign'|'ad'} matchKey - по чему матчить
 * @returns {object[]} - объединённые данные по кампаниям
 */
export function matchAndAggregate(metaRows, bitrixRows, matchKey = 'campaign') {
  // Группируем Meta по кампании → adset → ad
  const metaMap = new Map()

  for (const row of metaRows) {
    const campKey = norm(row.campaign_name)
    if (!metaMap.has(campKey)) {
      metaMap.set(campKey, {
        campaign_name: row.campaign_name,
        adsets: new Map(),
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
      })
    }
    const camp = metaMap.get(campKey)
    camp.totals.spend       += Number(row.spend)       || 0
    camp.totals.impressions += Number(row.impressions) || 0
    camp.totals.clicks      += Number(row.clicks)      || 0
    camp.totals.leads       += Number(row.leads)       || 0

    const adsetKey = norm(row.adset_name)
    if (!camp.adsets.has(adsetKey)) {
      camp.adsets.set(adsetKey, {
        adset_name: row.adset_name,
        ads: [],
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
      })
    }
    const adset = camp.adsets.get(adsetKey)
    adset.ads.push(row)
    adset.totals.spend       += Number(row.spend)       || 0
    adset.totals.impressions += Number(row.impressions) || 0
    adset.totals.clicks      += Number(row.clicks)      || 0
    adset.totals.leads       += Number(row.leads)       || 0
  }

  // Группируем Bitrix по ключу матчинга
  const bitrixMap = new Map()
  for (const deal of bitrixRows) {
    const key = matchKey === 'campaign'
      ? norm(deal.utm_campaign)
      : norm(deal.utm_content || deal.utm_campaign)

    if (!bitrixMap.has(key)) bitrixMap.set(key, [])
    bitrixMap.get(key).push(deal)
  }

  // Объединяем
  const campaigns = []
  for (const [campKey, campData] of metaMap) {
    const bxDeals = bitrixMap.get(campKey) || []
    const adsets  = Array.from(campData.adsets.values()).map((adset) => ({
      ...adset,
      ads: adset.ads,
      bxDeals,
      metrics: computeCampaignMetrics(adset.totals, bxDeals),
    }))

    campaigns.push({
      campaign_name: campData.campaign_name,
      adsets,
      bxDeals,
      totals: campData.totals,
      metrics: computeCampaignMetrics(campData.totals, bxDeals),
    })
  }

  // Добавляем Bitrix-сделки без пары в Meta (неопознанные)
  for (const [bxKey, deals] of bitrixMap) {
    if (!metaMap.has(bxKey)) {
      campaigns.push({
        campaign_name: deals[0]?.utm_campaign || bxKey || '(без кампании)',
        adsets: [],
        bxDeals: deals,
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
        metrics: computeCampaignMetrics({ spend: 0, impressions: 0, clicks: 0, leads: 0 }, deals),
        unmatched: true,
      })
    }
  }

  return campaigns
}

export function computeCampaignMetrics(totals, bxDeals) {
  const { spend, impressions, clicks, leads: metaLeads } = totals

  const bxLeads   = bxDeals.length
  const wonDeals  = bxDeals.filter((d) => norm(d.stage) === 'успешно').length
  const revenue   = bxDeals
    .filter((d) => norm(d.stage) === 'успешно')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  const ctr      = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc      = clicks > 0     ? spend / clicks : 0
  const cpl      = bxLeads > 0   ? spend / bxLeads : 0
  const winRate  = bxLeads > 0   ? (wonDeals / bxLeads) * 100 : 0
  const cpo      = wonDeals > 0  ? spend / wonDeals : 0
  const roas     = spend > 0     ? ((revenue - spend) / spend) * 100 : 0

  return {
    spend, impressions, clicks, metaLeads, bxLeads, wonDeals,
    revenue, ctr, cpc, cpl, winRate, cpo, roas,
    rowStatus: spend > 0 && (wonDeals === 0 || roas < 0) ? 'red'
             : roas >= 100 ? 'green'
             : 'neutral',
  }
}

/** Суммарные метрики по всем кампаниям */
export function computeTotals(campaigns) {
  const allDeals = campaigns.flatMap((c) => c.bxDeals)
  const totals = campaigns.reduce(
    (acc, c) => ({
      spend:       acc.spend + c.totals.spend,
      impressions: acc.impressions + c.totals.impressions,
      clicks:      acc.clicks + c.totals.clicks,
      leads:       acc.leads + c.totals.leads,
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 }
  )
  return computeCampaignMetrics(totals, allDeals)
}

/** Данные для графика по дням */
export function buildDailyChartData(campaigns) {
  const byDay = new Map()
  for (const camp of campaigns) {
    for (const deal of camp.bxDeals) {
      const date = deal.created_date?.split('T')[0] || 'unknown'
      if (!byDay.has(date)) byDay.set(date, { date, revenue: 0, deals: 0 })
      const day = byDay.get(date)
      if ((deal.stage || '').toLowerCase() === 'успешно') {
        day.revenue += Number(deal.amount) || 0
        day.deals++
      }
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** Данные для графика расходы/выручка по кампаниям */
export function buildCampaignChartData(campaigns) {
  return campaigns.map((c) => ({
    name: c.campaign_name.length > 22 ? c.campaign_name.slice(0, 20) + '…' : c.campaign_name,
    fullName: c.campaign_name,
    spend: Math.round(c.metrics.spend),
    revenue: Math.round(c.metrics.revenue),
    roas: Math.round(c.metrics.roas),
  }))
}

/** Данные воронки конверсии */
export function buildFunnelData(totals) {
  return [
    { name: 'Показы',   value: totals.impressions, fill: '#38bdf8' },
    { name: 'Клики',    value: totals.clicks,       fill: '#818cf8' },
    { name: 'Лиды',     value: totals.bxLeads,      fill: '#fb923c' },
    { name: 'Продажи',  value: totals.wonDeals,     fill: '#34d399' },
  ]
}
