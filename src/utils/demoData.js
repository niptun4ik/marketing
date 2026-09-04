// utils/demoData.js
// Реалистичные демо-данные для тестирования интерфейса

export const DEMO_META_ROWS = [
  { campaign_name: 'Lead Gen – Autumn 2026', adset_name: 'Алматы 25-45', ad_name: 'Creative_v1', date: '2026-08-10', date_end: '2026-09-03', spend: 450, impressions: 180000, clicks: 3600, leads: 72 },
  { campaign_name: 'Lead Gen – Autumn 2026', adset_name: 'Алматы 25-45', ad_name: 'Creative_v2', date: '2026-08-15', date_end: '2026-09-03', spend: 320, impressions: 140000, clicks: 2800, leads: 56 },
  { campaign_name: 'Lead Gen – Autumn 2026', adset_name: 'Астана 30-50',  ad_name: 'Creative_v1', date: '2026-08-20', date_end: '2026-09-03', spend: 180, impressions: 75000,  clicks: 1500, leads: 30 },
  { campaign_name: 'Retargeting – Q3',       adset_name: 'Посетители сайта', ad_name: 'Offer_A', date: '2026-08-22', date_end: '2026-09-03', spend: 220, impressions: 95000,  clicks: 2850, leads: 45 },
  { campaign_name: 'Retargeting – Q3',       adset_name: 'Брошенная корзина', ad_name: 'Offer_B', date: '2026-08-25', date_end: '2026-09-03', spend: 150, impressions: 62000,  clicks: 1860, leads: 28 },
  { campaign_name: 'Brand Awareness',        adset_name: 'Весь Казахстан', ad_name: 'Video_30s', date: '2026-08-10', date_end: '2026-09-03', spend: 380, impressions: 520000, clicks: 5200, leads: 0  },
  { campaign_name: 'Product Launch – Aug',   adset_name: 'Шымкент 28-55', ad_name: 'Banner_1',  date: '2026-08-12', date_end: '2026-09-03', spend: 610, impressions: 210000, clicks: 4200, leads: 84 },
  { campaign_name: 'Product Launch – Aug',   adset_name: 'Шымкент 28-55', ad_name: 'Banner_2',  date: '2026-08-18', date_end: '2026-09-03', spend: 290, impressions: 98000,  clicks: 1960, leads: 39 },
]

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

function genDeals(campaign, status, count, avgAmount = 0) {
  return Array.from({ length: count }, (_, i) => ({
    deal_id: `${campaign.slice(0, 4).replace(/\s/g, '')}-${status.slice(0,2)}-${i + 1}`,
    created_date: randomDate(new Date('2026-08-01T00:00:00'), new Date('2026-09-03T23:59:59')),
    utm_source: 'facebook',
    utm_campaign: campaign,
    stage: status,
    amount: status === 'Успешно' ? Math.round(avgAmount * (0.8 + Math.random() * 0.4)) : 0,
  }))
}

export const DEMO_BITRIX_ROWS = [
  // Lead Gen – Autumn 2026
  ...genDeals('Lead Gen – Autumn 2026', 'Новая', 18),
  ...genDeals('Lead Gen – Autumn 2026', 'В работе', 42),
  ...genDeals('Lead Gen – Autumn 2026', 'Успешно', 31, 65000),
  ...genDeals('Lead Gen – Autumn 2026', 'Проиграна', 25),
  // Retargeting – Q3
  ...genDeals('Retargeting – Q3', 'Новая', 9),
  ...genDeals('Retargeting – Q3', 'В работе', 22),
  ...genDeals('Retargeting – Q3', 'Успешно', 18, 95000),
  ...genDeals('Retargeting – Q3', 'Проиграна', 12),
  // Brand Awareness – нет продаж, только трафик
  ...genDeals('Brand Awareness', 'Новая', 3),
  ...genDeals('Brand Awareness', 'В работе', 5),
  ...genDeals('Brand Awareness', 'Проиграна', 4),
  // Product Launch – Aug
  ...genDeals('Product Launch – Aug', 'Новая', 22),
  ...genDeals('Product Launch – Aug', 'В работе', 38),
  ...genDeals('Product Launch – Aug', 'Успешно', 27, 125000),
  ...genDeals('Product Launch – Aug', 'Проиграна', 18),
]

export const META_COLUMNS = ['campaign_name', 'adset_name', 'ad_name', 'date', 'date_end', 'spend', 'impressions', 'clicks', 'leads']
export const BITRIX_COLUMNS = ['deal_id', 'created_date', 'utm_source', 'utm_campaign', 'stage', 'amount']

// Список стандартных полей с возможными альтернативными названиями (для автодетекта)
export const META_FIELD_ALIASES = {
  campaign_name: ['название кампании', 'campaign name', 'campaign_name', 'кампания', 'campaign'],
  adset_name:    ['название группы объявлений', 'название группы', 'группа объявлений', 'группы объявлений', 'ad set name', 'adset name', 'adset_name', 'adset'],
  ad_name:       ['название объявления', 'ad name', 'ad_name', 'объявление', 'ad'],
  date:          ['дата начала отчетности', 'дата начала', 'date start', 'reporting starts', 'дата', 'день', 'day', 'date'],
  date_end:      ['окончание отчетности', 'дата окончания', 'date stop', 'reporting ends', 'дата конца', 'date_end', 'end date', 'конец'],
  spend:         ['потраченная сумма', 'потраченная сумма (usd)', 'потрачено', 'сумма расходов', 'spend', 'затраты', 'расходы', 'cost', 'amount spent'],
  impressions:   ['показы', 'impressions', 'impr', 'охват'],
  clicks:        ['клики по ссылке', 'клики (все)', 'клики', 'clicks', 'link clicks'],
  leads:         ['результат', 'лиды', 'leads', 'результаты', 'results'],
}

export const BITRIX_FIELD_ALIASES = {
  deal_id:      ['id', 'deal id', 'lead id', 'id сделки', 'deal_id', '# сделки'],
  created_date: ['дата создания', 'дата добавления', 'created date', 'date', 'дата', 'created_date', 'время создания'],
  deal_name:    ['название сделки', 'название', 'deal_name', 'deal name', 'тема'],
  formname:     ['formname', 'название формы', 'crm-форма', 'создана crm-формой', 'форма'],
  utm_source:   ['utm_source', 'utm source', 'источник', 'source', 'источник сделки'],
  utm_campaign: ['utm_campaign', 'utm campaign', 'кампания', 'campaign', 'utm-кампания'],
  stage:        ['стадия сделки', 'стадия', 'статус', 'stage', 'status'],
  amount:       ['сумма', 'сумма сделки', 'выручка', 'amount', 'revenue'],
}

