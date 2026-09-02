// utils/demoData.js
// Реалистичные демо-данные для тестирования интерфейса

export const DEMO_META_ROWS = [
  { campaign_name: 'Lead Gen – Autumn 2024', adset_name: 'Moscow 25-45', ad_name: 'Creative_v1', spend: 45000, impressions: 180000, clicks: 3600, leads: 72 },
  { campaign_name: 'Lead Gen – Autumn 2024', adset_name: 'Moscow 25-45', ad_name: 'Creative_v2', spend: 32000, impressions: 140000, clicks: 2800, leads: 56 },
  { campaign_name: 'Lead Gen – Autumn 2024', adset_name: 'SPb 30-50',   ad_name: 'Creative_v1', spend: 18000, impressions: 75000,  clicks: 1500, leads: 30 },
  { campaign_name: 'Retargeting – Q4',       adset_name: 'Site Visitors', ad_name: 'Offer_A',    spend: 22000, impressions: 95000,  clicks: 2850, leads: 45 },
  { campaign_name: 'Retargeting – Q4',       adset_name: 'Cart Abandon',  ad_name: 'Offer_B',    spend: 15000, impressions: 62000,  clicks: 1860, leads: 28 },
  { campaign_name: 'Brand Awareness',        adset_name: 'Russia Wide',   ad_name: 'Video_30s',  spend: 38000, impressions: 520000, clicks: 5200, leads: 0  },
  { campaign_name: 'Product Launch – Nov',   adset_name: 'LA 28-55',      ad_name: 'Banner_1',   spend: 61000, impressions: 210000, clicks: 4200, leads: 84 },
  { campaign_name: 'Product Launch – Nov',   adset_name: 'LA 28-55',      ad_name: 'Banner_2',   spend: 29000, impressions: 98000,  clicks: 1960, leads: 39 },
]

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

function genDeals(campaign, status, count, avgAmount = 0) {
  return Array.from({ length: count }, (_, i) => ({
    deal_id: `${campaign.slice(0, 4).replace(/\s/g, '')}-${status.slice(0,2)}-${i + 1}`,
    created_date: randomDate(new Date('2024-10-01'), new Date('2024-11-30')),
    utm_source: 'facebook',
    utm_campaign: campaign,
    stage: status,
    amount: status === 'Успешно' ? Math.round(avgAmount * (0.7 + Math.random() * 0.6)) : 0,
  }))
}

export const DEMO_BITRIX_ROWS = [
  // Lead Gen – Autumn 2024
  ...genDeals('Lead Gen – Autumn 2024', 'Новая', 18),
  ...genDeals('Lead Gen – Autumn 2024', 'В работе', 42),
  ...genDeals('Lead Gen – Autumn 2024', 'Успешно', 31, 12000),
  ...genDeals('Lead Gen – Autumn 2024', 'Проиграна', 25),
  // Retargeting – Q4
  ...genDeals('Retargeting – Q4', 'Новая', 9),
  ...genDeals('Retargeting – Q4', 'В работе', 22),
  ...genDeals('Retargeting – Q4', 'Успешно', 18, 15000),
  ...genDeals('Retargeting – Q4', 'Проиграна', 12),
  // Brand Awareness – нет продаж, только трафик
  ...genDeals('Brand Awareness', 'Новая', 3),
  ...genDeals('Brand Awareness', 'В работе', 5),
  ...genDeals('Brand Awareness', 'Проиграна', 4),
  // Product Launch – Nov
  ...genDeals('Product Launch – Nov', 'Новая', 22),
  ...genDeals('Product Launch – Nov', 'В работе', 38),
  ...genDeals('Product Launch – Nov', 'Успешно', 27, 18000),
  ...genDeals('Product Launch – Nov', 'Проиграна', 18),
]

export const META_COLUMNS = ['campaign_name', 'adset_name', 'ad_name', 'spend', 'impressions', 'clicks', 'leads']
export const BITRIX_COLUMNS = ['deal_id', 'created_date', 'utm_source', 'utm_campaign', 'stage', 'amount']

// Список стандартных полей с возможными альтернативными названиями (для автодетекта)
export const META_FIELD_ALIASES = {
  campaign_name: ['campaign name', 'campaign', 'кампания', 'название кампании', 'campaign_name'],
  adset_name:    ['adset name', 'adset', 'группа объявлений', 'ad set name', 'adset_name'],
  ad_name:       ['ad name', 'ad', 'объявление', 'название объявления', 'ad_name'],
  spend:         ['spend', 'затраты', 'расходы', 'cost', 'amount spent', 'сумма расходов'],
  impressions:   ['impressions', 'показы', 'impr'],
  clicks:        ['clicks', 'клики', 'link clicks'],
  leads:         ['leads', 'лиды', 'результаты', 'results'],
}

export const BITRIX_FIELD_ALIASES = {
  deal_id:      ['id', 'deal id', 'lead id', 'id сделки', 'deal_id', '# сделки'],
  created_date: ['created date', 'дата создания', 'date', 'дата', 'created_date', 'дата добавления'],
  utm_source:   ['utm_source', 'utm source', 'источник', 'source'],
  utm_campaign: ['utm_campaign', 'utm campaign', 'кампания', 'campaign', 'utm-кампания'],
  stage:        ['stage', 'стадия', 'статус', 'status', 'стадия сделки'],
  amount:       ['amount', 'сумма', 'выручка', 'revenue', 'сумма сделки'],
}
