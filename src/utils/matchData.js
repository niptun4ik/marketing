// utils/matchData.js
// Объединение данных Meta Ads и Bitrix24 по ключу кампании

export const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

// Парсит число из строки Meta Ads: "1 234,56" / "1,234.56" / "1234.5" / 1234 → 1234.56
export const toNum = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  if (!v) return 0
  const s = String(v).trim()
    .replace(/\s/g, '')                   // убираем пробелы-разделители тысяч
    .replace(/,(?=\d{3}(?:[^,]|$))/g, '') // убираем "," как разделитель тысяч (1,234)
    .replace(',', '.')                    // европейский десятичный разделитель "," → "."
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// Проверяет, является ли стадия успешной сделкой (поддерживает вариации Bitrix24)
export const isWonStage = (stage) => {
  const s = norm(stage)
  return s === 'успешно' || s.includes('успеш') || s.includes('won') || s.includes('оплач')
}

/**
 * Матчинг Meta-строки с Bitrix-строками.
 * @param {object[]} metaRows    - строки из Meta Ads (после маппинга)
 * @param {object[]} bitrixRows  - строки из Bitrix24 (после маппинга)
 * @param {'campaign'|'ad'} matchKey - по чему матчить
 * @returns {object[]} - объединённые данные по кампаниям
 */
export function matchAndAggregate(metaRows = [], bitrixRows = [], matchKey = 'campaign') {
  // Группируем Meta по кампании → adset → ad
  const metaMap = new Map()

  for (const row of metaRows || []) {
    const rawCampName = String(row?.campaign_name || '(без кампании)').trim()
    const campKey = norm(rawCampName)

    if (!metaMap.has(campKey)) {
      metaMap.set(campKey, {
        campaign_name: rawCampName,
        adsets: new Map(),
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
      })
    }
    const camp = metaMap.get(campKey)
    camp.totals.spend       += toNum(row?.spend)
    camp.totals.impressions += toNum(row?.impressions)
    camp.totals.clicks      += toNum(row?.clicks)
    camp.totals.leads       += toNum(row?.leads)

    const rawAdsetName = String(row?.adset_name || '(без группы)').trim()
    const adsetKey = norm(rawAdsetName)

    if (!camp.adsets.has(adsetKey)) {
      camp.adsets.set(adsetKey, {
        adset_name: rawAdsetName,
        ads: [],
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
      })
    }
    const adset = camp.adsets.get(adsetKey)
    adset.ads.push(row)
    adset.totals.spend       += toNum(row?.spend)
    adset.totals.impressions += toNum(row?.impressions)
    adset.totals.clicks      += toNum(row?.clicks)
    adset.totals.leads       += toNum(row?.leads)
  }

  // Группируем Bitrix по ключу матчинга
  const bitrixMap = new Map()
  for (const deal of bitrixRows || []) {
    const key = matchKey === 'campaign'
      ? norm(deal?.utm_campaign)
      : norm(deal?.utm_content || deal?.utm_campaign)

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
      const campName = deals[0]?.utm_campaign || bxKey || '(без кампании)'
      campaigns.push({
        campaign_name: String(campName),
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

export function computeCampaignMetrics(totals = {}, bxDeals = [], margin = 1) {
  const spend       = toNum(totals.spend)
  const impressions = toNum(totals.impressions)
  const clicks      = toNum(totals.clicks)
  const metaLeads   = toNum(totals.leads)

  const bxLeads   = (bxDeals || []).length
  const wonDeals  = (bxDeals || []).filter((d) => isWonStage(d?.stage)).length
  const revenue   = (bxDeals || []).filter((d) => isWonStage(d?.stage))
                                    .reduce((sum, d) => sum + toNum(d?.amount), 0)

  const ctr      = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpm      = impressions > 0 ? (spend / impressions) * 1000 : 0
  const cpc      = clicks > 0     ? spend / clicks : 0
  const metaCr   = clicks > 0     ? (metaLeads / clicks) * 100 : 0
  const bxCr     = clicks > 0     ? (bxLeads / clicks) * 100 : 0
  const cpl      = bxLeads > 0   ? spend / bxLeads : 0
  const metaCpl  = metaLeads > 0 ? spend / metaLeads : 0
  const winRate  = bxLeads > 0   ? (wonDeals / bxLeads) * 100 : 0
  const cpo      = wonDeals > 0  ? spend / wonDeals : 0
  const roas     = spend > 0     ? ((revenue - spend) / spend) * 100 : 0
  const romi     = spend > 0     ? ((revenue * Math.min(margin, 1) - spend) / spend) * 100 : 0

  return {
    spend, impressions, clicks, metaLeads, bxLeads, wonDeals,
    revenue, ctr, cpm, cpc, metaCr, bxCr, cpl, metaCpl, winRate, cpo, roas, romi,
    rowStatus: spend > 0 && (wonDeals === 0 || roas < 0) ? 'red'
             : roas >= 100 ? 'green'
             : 'neutral',
  }
}

/** Суммарные метрики по всем кампаниям */
export function computeTotals(campaigns = []) {
  const allDeals = (campaigns || []).flatMap((c) => c?.bxDeals || [])
  const totals = (campaigns || []).reduce(
    (acc, c) => ({
      spend:       acc.spend + toNum(c?.totals?.spend),
      impressions: acc.impressions + toNum(c?.totals?.impressions),
      clicks:      acc.clicks + toNum(c?.totals?.clicks),
      leads:       acc.leads + toNum(c?.totals?.leads),
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 }
  )
  return computeCampaignMetrics(totals, allDeals)
}

/** Данные для графика по дням (из Bitrix + Meta если есть дата) */
export function buildDailyChartData(campaigns = []) {
  const byDay = new Map()

  const ensureDay = (date) => {
    if (!byDay.has(date)) byDay.set(date, { date, spend: 0, metaLeads: 0, bxLeads: 0, wonDeals: 0, revenue: 0 })
    return byDay.get(date)
  }

  for (const camp of campaigns || []) {
    // Meta spend по дням (если в строках есть поле date)
    for (const adset of camp?.adsets || []) {
      for (const ad of adset?.ads || []) {
        const rawDate = ad?.date
        if (rawDate) {
          const date = String(rawDate).slice(0, 10)
          const day = ensureDay(date)
          day.spend     += toNum(ad?.spend)
          day.metaLeads += toNum(ad?.leads)
        }
      }
    }

    // Bitrix сделки по дням
    for (const deal of camp?.bxDeals || []) {
      const rawDate = deal?.created_date

    // Bitrix сделки по дням
    for (const deal of camp?.bxDeals || []) {
      const rawDate = deal?.created_date
      let date = null
      if (typeof rawDate === 'string') date = rawDate.split('T')[0]
      else if (rawDate instanceof Date) date = rawDate.toISOString().split('T')[0]
      else if (rawDate) date = String(rawDate).slice(0, 10)
      if (!date) continue

      const day = ensureDay(date)
      day.bxLeads++
      if (isWonStage(deal?.stage)) {
        day.wonDeals++
        day.revenue += toNum(deal?.amount)
      }
    }
  }

  return Array.from(byDay.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      cpl: d.metaLeads > 0 ? +(d.spend / d.metaLeads).toFixed(2) : null,
    }))
}

/** Данные для графика расходы/выручка по кампаниям */
export function buildCampaignChartData(campaigns = []) {
  return (campaigns || []).map((c) => {
    const rawName = String(c?.campaign_name || '(без названия)')
    return {
      name: rawName.length > 22 ? rawName.slice(0, 20) + '…' : rawName,
      fullName: rawName,
      spend: Number((c?.metrics?.spend || 0).toFixed(2)),
      revenue: Number((c?.metrics?.revenue || 0).toFixed(2)),
      roas: Number((c?.metrics?.roas || 0).toFixed(2)),
    }
  })
}

/** Данные воронки конверсии с кастомными стадиями Bitrix */
export function buildFunnelData(totals = {}, bxDeals = [], stageOrder = []) {
  const FUNNEL_COLORS = ['#fb923c', '#facc15', '#a3e635', '#34d399', '#2dd4bf']

  const steps = [
    { name: 'Показы',      value: toNum(totals.impressions), fill: '#38bdf8' },
    { name: 'Клики',       value: toNum(totals.clicks),      fill: '#818cf8' },
    { name: 'Лиды (Meta)', value: toNum(totals.metaLeads),   fill: '#f472b6' },
  ]

  if (stageOrder?.length > 0 && bxDeals?.length > 0) {
    // Кастомные стадии Bitrix в заданном порядке
    stageOrder.forEach((stageName, i) => {
      const count = (bxDeals || []).filter(d => norm(d?.stage) === norm(stageName)).length
      steps.push({ name: stageName, value: count, fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length], isBxStage: true })
    })
  } else {
    // Фолбэк без настроенной воронки
    steps.push({ name: 'Лиды BX',  value: toNum(totals.bxLeads),  fill: '#fb923c' })
    steps.push({ name: 'Продажи',  value: toNum(totals.wonDeals), fill: '#34d399' })
  }

  return steps
}

