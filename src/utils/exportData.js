import * as XLSX from 'xlsx'
import { isWonStage, norm } from './matchData'

const HEADERS = [
  'Кампания', 'Группа объявлений', 'Объявление',
  'Показы', 'CPM', 'Клики', 'CTR (%)', 'CPC',
  'Spend ($)', 'Рез. (Meta)', 'CR (Meta, %)', 'Цена рез. ($)', 'Лиды BX', 'CR (BX, %)', 'CPL (BX, $)',
  'Выигранные сделки', 'Win Rate (%)', 'Выручка (₸)', 'CPO ($)', 'ROAS (%)',
]

function flattenCampaigns(campaigns, usdRate = 500) {
  const rows = []
  for (const camp of campaigns) {
    if (!camp.adsets || camp.adsets.length === 0) {
      const m = camp.metrics || {}
      rows.push([
        camp.campaign_name, '', '',
        m.impressions || 0, fmt2(m.cpm || 0), m.clicks || 0, fmt2(m.ctr || 0), fmt2(m.cpc || 0),
        m.spend || 0, m.metaLeads || 0, fmt2(m.metaCr || 0), fmt2(m.metaCpl || 0), m.bxLeads || 0, fmt2(m.bxCr || 0), fmt2(m.cpl || 0),
        m.wonDeals || 0, fmt2(m.winRate || 0), m.revenue || 0, fmt2(m.cpo || 0), fmt2(m.roas || 0),
      ])
    } else {
      for (const adset of camp.adsets) {
        for (const ad of (adset.ads || [])) {
          const adNameNorm = norm(ad.ad_name)
          const adIdStr = String(ad.ad_id || '').trim()
          // Привязываем сделку к объявлению ТОЛЬКО при явном совпадении utm_content
          const adDeals = (camp.bxDeals || []).filter(d => {
            const utm = norm(d?.utm_content)
            return utm && (utm === adNameNorm || utm === adIdStr)
          })
          const m = computeAdMetrics(ad, adDeals, usdRate)
          rows.push([
            camp.campaign_name, adset.adset_name, ad.ad_name,
            m.impressions, fmt2(m.cpm), m.clicks, fmt2(m.ctr), fmt2(m.cpc),
            m.spend, m.metaLeads, fmt2(m.metaCr), fmt2(m.metaCpl), m.bxLeads, fmt2(m.bxCr), fmt2(m.cpl),
            m.wonDeals, fmt2(m.winRate), m.revenue, fmt2(m.cpo), fmt2(m.roas),
          ])
        }
      }
    }
  }
  return rows
}

function computeAdMetrics(ad, bxDeals = [], usdRate = 500) {
  const spend       = Number(ad?.spend) || 0
  const impressions = Number(ad?.impressions) || 0
  const clicks      = Number(ad?.clicks) || 0
  const metaLeads   = Number(ad?.leads) || 0
  const bxLeads     = bxDeals.length
  const wonDeals    = bxDeals.filter(d => isWonStage(d?.stage)).length
  const revenue     = bxDeals
    .filter(d => isWonStage(d?.stage))
    .reduce((s, d) => s + (Number(d?.amount) || 0), 0)

  const spendInKzt = spend * (Number(usdRate) || 500)

  return {
    spend, impressions, clicks, metaLeads, bxLeads, wonDeals, revenue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    metaCr: clicks > 0 ? (metaLeads / clicks) * 100 : 0,
    bxCr: clicks > 0 && bxLeads > 0 ? (bxLeads / clicks) * 100 : 0,
    metaCpl: metaLeads > 0 ? spend / metaLeads : 0,
    cpl: bxLeads > 0 ? spend / bxLeads : 0,
    winRate: bxLeads > 0 ? (wonDeals / bxLeads) * 100 : 0,
    cpo: wonDeals > 0 ? spend / wonDeals : 0,
    roas: spendInKzt > 0 && revenue > 0 ? ((revenue - spendInKzt) / spendInKzt) * 100 : 0,
  }
}

const fmt2 = (n) => Math.round(n * 100) / 100

export function exportToXLSX(campaigns, filename = 'marketing_analytics.xlsx', usdRate = 500) {
  const dataRows = flattenCampaigns(campaigns, usdRate)
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...dataRows])

  // Стили ширины колонок
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Аналитика')
  XLSX.writeFile(wb, filename)
}

export function exportToCSV(campaigns, filename = 'marketing_analytics.csv', usdRate = 500) {
  const dataRows = flattenCampaigns(campaigns, usdRate)
  const all = [HEADERS, ...dataRows]
  const csv = all.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
