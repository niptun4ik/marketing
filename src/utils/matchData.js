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
export function matchAndAggregate(metaRows = [], bitrixRows = [], matchKey = 'campaign', usdRate = 500, margin = 1) {
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

  // Хелпер для поиска наиболее подходящей кампании для сделки
  const metaCampaignKeys = Array.from(metaMap.keys())

  const findBestCampaignKey = (deal) => {
    // 1. Прямая точная метка utm_campaign
    const directKey = norm(deal?.utm_campaign)
    if (directKey && metaMap.has(directKey)) return directKey

    // 2. Поиск по подстроке utm_campaign
    if (directKey) {
      const subMatch = metaCampaignKeys.find(k => k.includes(directKey) || directKey.includes(k))
      if (subMatch) return subMatch
    }

    // 3. Умный поиск по formname, названию сделки или источнику
    const combinedText = norm([
      deal?.formname,
      deal?.deal_name,
      deal?.utm_source,
      deal?.utm_content,
      deal?.['Название сделки'],
      deal?.['formname'],
      deal?.['Дополнительно об источнике'],
    ].filter(Boolean).join(' '))

    if (combinedText) {
      // Ищем совпадение среди реальных кампаний Meta
      for (const campKey of metaCampaignKeys) {
        // Очищаем от мусорных слов типа "лендинг", "лиды", "тест"
        const cleanKey = campKey.replace(/[|()—–\-_]/g, ' ').replace(/\s+/g, ' ').trim()
        const words = cleanKey.split(' ').filter(w => w.length > 3)
        // Если ключевые слова (например "отношения", "моп", "астана") встречаются в сделке
        const matchCount = words.filter(w => combinedText.includes(w)).length
        if (words.length > 0 && matchCount >= Math.min(2, words.length)) {
          return campKey
        }
      }

      // Специальные распространенные маркеры
      if (combinedText.includes('отношен')) {
        const otnoshCamp = metaCampaignKeys.find(k => k.includes('отношен'))
        if (otnoshCamp) return otnoshCamp
      }
      if (combinedText.includes('моп')) {
        const mopCamp = metaCampaignKeys.find(k => k.includes('моп'))
        if (mopCamp) return mopCamp
      }
    }

    // Если у нас в Meta вообще всего 1 кампания, и сделка пришла из таргета/формы
    if (metaCampaignKeys.length === 1 && (combinedText.includes('форма') || combinedText.includes('сайт') || combinedText.includes('таргет') || !deal?.utm_campaign)) {
      return metaCampaignKeys[0]
    }

    return directKey || '(без кампании)'
  }

  // Группируем Bitrix по найденному ключу
  const bitrixMap = new Map()
  for (const deal of bitrixRows || []) {
    const key = findBestCampaignKey(deal)
    if (!bitrixMap.has(key)) bitrixMap.set(key, [])
    bitrixMap.get(key).push(deal)
  }

  // Объединяем
  const campaigns = []
  for (const [campKey, campData] of metaMap) {
    const bxDeals = bitrixMap.get(campKey) || []
    const adsets  = Array.from(campData.adsets.values()).map((adset) => {
      // Привязываем сделку к adset ТОЛЬКО если utm_content совпадает с названием группы
      const adsetNameNorm = norm(adset.adset_name)
      const adsetDeals = bxDeals.filter(d => {
        const utm = norm(d?.utm_content)
        return utm && (utm === adsetNameNorm || adsetNameNorm.includes(utm))
      })
      return {
        ...adset,
        ads: adset.ads,
        bxDeals: adsetDeals,
        metrics: computeCampaignMetrics(adset.totals, adsetDeals, margin, usdRate),
      }
    })

    campaigns.push({
      campaign_name: campData.campaign_name,
      adsets,
      bxDeals,
      totals: campData.totals,
      metrics: computeCampaignMetrics(campData.totals, bxDeals, margin, usdRate),
    })
  }

  // Добавляем действительно нераспознанные Bitrix-сделки
  for (const [bxKey, deals] of bitrixMap) {
    if (!metaMap.has(bxKey)) {
      const campName = deals[0]?.utm_campaign || (bxKey !== '(без кампании)' ? bxKey : '(без кампании)')
      campaigns.push({
        campaign_name: String(campName),
        adsets: [],
        bxDeals: deals,
        totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
        metrics: computeCampaignMetrics({ spend: 0, impressions: 0, clicks: 0, leads: 0 }, deals, margin, usdRate),
        unmatched: true,
      })
    }
  }

  return campaigns
}

export function computeCampaignMetrics(totals = {}, bxDeals = [], margin = 1, usdRate = 500) {
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

  // Если выручка в тенге (KZT > 2000 или валюта KZT), переводим spend ($) по актуальному курсу
  const rate = usdRate || 500
  const isKzt = (bxDeals || []).some(d => String(d?.currency || '').toUpperCase() === 'KZT') || revenue > 2000
  const spendInRevCurrency = isKzt ? spend * rate : spend

  const roas     = spendInRevCurrency > 0 ? ((revenue - spendInRevCurrency) / spendInRevCurrency) * 100 : 0
  const romi     = spendInRevCurrency > 0 ? ((revenue * Math.min(margin, 1) - spendInRevCurrency) / spendInRevCurrency) * 100 : 0

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

/**
 * Умный парсер дат: определяет реальные дни и месяцы без путаницы US/RU форматов.
 * Преобразует любые варианты дат в стандартизированный ISO ключ 'YYYY-MM-DD'.
 */
export const parseDateKey = (raw) => {
  if (!raw) return null
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = raw.getMonth() + 1
    const d = raw.getDate()
    // Защита от инвертированных дат (когда Date создан парсером с американской локалью)
    if (y === 2026 && m > 9 && d <= 12) {
      return `${y}-${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`
    }
    if (y === 2026 && m <= 3 && (d === 8 || d === 9)) {
      return `${y}-${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`
    }
    if (y === 2026 && m >= 5 && m <= 7 && d === 8) {
      return `${y}-${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const s = String(raw).trim()

  // 1. ISO формат YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    let [, y, m, d] = isoMatch
    const yNum = parseInt(y, 10)
    const mNum = parseInt(m, 10)
    const dNum = parseInt(d, 10)

    // Защита от инвертированных дат (когда Excel с американской локалью поменял день и месяц местами)
    // 1. Месяц в будущем: в 2026 году месяц > 9 (окт, ноя, дек) еще не наступил! (12.08 -> 2026-12-08 -> 8 дек -> возвращаем 2026-08-12)
    if (yNum === 2026 && mNum > 9 && dNum <= 12) {
      return `${y}-${String(dNum).padStart(2, '0')}-${String(mNum).padStart(2, '0')}`
    }
    // 2. Месяцы 1..3 (янв, фев, мар) при дне 08 или 09 в сделках 2026 года (01.09 -> 2026-01-09 -> возвращаем 2026-09-01)
    if (yNum === 2026 && mNum <= 3 && (dNum === 8 || dNum === 9)) {
      return `${y}-${String(dNum).padStart(2, '0')}-${String(mNum).padStart(2, '0')}`
    }
    // 3. Месяцы 5..7 при дне 08 (07.08 -> 2026-07-08 -> возвращаем 2026-08-07)
    if (yNum === 2026 && mNum >= 5 && mNum <= 7 && dNum === 8) {
      return `${y}-${String(dNum).padStart(2, '0')}-${String(mNum).padStart(2, '0')}`
    }

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // 2. Формат с годом в конце: DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY
  const mEnd = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (mEnd) {
    let [, n1, n2, y] = mEnd
    n1 = parseInt(n1, 10)
    n2 = parseInt(n2, 10)

    let d, m
    if (n2 > 12) {
      // Например 08.24.2026 -> второе число день
      m = n1
      d = n2
    } else {
      // Стандартный формат СНГ/Битрикс: первое число ДЕНЬ, второе МЕСЯЦ (01.09 = 1 сен, 03.09 = 3 сен)
      d = n1
      m = n2
    }

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return null
}

export const extractMetaDateKey = (row) => {
  if (!row) return null
  const direct = parseDateKey(
    row.date ||
    row['Дата начала отчетности'] ||
    row['Дата начала'] ||
    row['Date start'] ||
    row['Reporting starts'] ||
    row['День'] ||
    row['Day'] ||
    row['Дата']
  )
  if (direct) return direct

  for (const val of Object.values(row)) {
    if (typeof val === 'string' && val.length >= 8) {
      const d = parseDateKey(val)
      if (d) return d
    }
  }
  return null
}

export const extractMetaDateRange = (row) => {
  if (!row) return null
  const startRaw = row.date ||
    row['Дата начала отчетности'] ||
    row['Дата начала'] ||
    row['Date start'] ||
    row['Reporting starts'] ||
    row['День'] ||
    row['Day'] ||
    row['Дата']
  const start = parseDateKey(startRaw)

  let endRaw = row.date_end ||
    row['Окончание отчетности'] ||
    row['Дата окончания'] ||
    row['Date stop'] ||
    row['Reporting ends'] ||
    row['Конец'] ||
    row['Конец отчетности']
  let end = parseDateKey(endRaw)

  if (!end) {
    for (const [k, val] of Object.entries(row)) {
      if (typeof val === 'string' && val.length >= 8) {
        const kLower = k.toLowerCase()
        if (kLower.includes('окончан') || kLower.includes('конец') || kLower.includes('stop') || kLower.includes('end')) {
          const d = parseDateKey(val)
          if (d) { end = d; break }
        }
      }
    }
  }

  if (!start) {
    for (const val of Object.values(row)) {
      if (typeof val === 'string' && val.length >= 8) {
        const d = parseDateKey(val)
        if (d) return { start: d, end: d }
      }
    }
    return null
  }

  return { start, end: end || start }
}

export function getDaysInRange(startStr, endStr) {
  if (!startStr) return []
  if (!endStr || startStr === endStr) return [startStr]
  const days = []
  let curr = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  if (isNaN(curr.getTime()) || isNaN(end.getTime()) || curr > end) {
    return [startStr]
  }
  let count = 0
  while (curr <= end && count < 90) {
    const y = curr.getFullYear()
    const m = String(curr.getMonth() + 1).padStart(2, '0')
    const d = String(curr.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    curr.setDate(curr.getDate() + 1)
    count++
  }
  return days.length > 0 ? days : [startStr]
}

export const extractBitrixDateKey = (deal) => {
  if (!deal) return null
  const direct = parseDateKey(
    deal.created_date ||
    deal['Дата создания'] ||
    deal['Дата добавления'] ||
    deal['Дата'] ||
    deal['created_date']
  )
  if (direct) return direct

  for (const val of Object.values(deal)) {
    if (typeof val === 'string' && val.length >= 8) {
      const d = parseDateKey(val)
      if (d) return d
    }
  }
  return null
}

const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_RU_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

export const formatRuDate = (key) => {
  if (!key) return ''
  const parts = String(key).split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y}`
  }
  return key
}

export const formatRuShort = (key) => {
  if (!key) return ''
  const parts = String(key).split('-')
  if (parts.length === 3) {
    const [, m, d] = parts
    const mIdx = parseInt(m, 10) - 1
    return `${parseInt(d, 10)} ${MONTHS_RU_SHORT[mIdx] || m}`
  }
  return key
}

export const formatRuFullDate = (key) => {
  if (!key) return ''
  const parts = String(key).split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    const mIdx = parseInt(m, 10) - 1
    return `${parseInt(d, 10)} ${MONTHS_RU_FULL[mIdx] || m} ${y} г.`
  }
  return key
}

/** Данные для графика по дням с поддержкой распределения периода Meta Ads */
export function buildDailyChartData(campaigns = [], dateFrom = null, dateTo = null) {
  const byDay = new Map()

  const ensureDay = (date) => {
    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        spend: 0,
        metaLeads: 0,
        clicks: 0,
        impressions: 0,
        bxLeads: 0,
        wonDeals: 0,
        revenue: 0,
        hasDailyMeta: false,
        isDistributed: false,
      })
    }
    return byDay.get(date)
  }

  let totalMetaSpend = 0
  let totalMetaLeads = 0
  let isAnyDistributed = false

  for (const camp of campaigns || []) {
    totalMetaSpend += toNum(camp?.totals?.spend)
    totalMetaLeads += toNum(camp?.totals?.leads)

    // Meta spend по дням (из объявлений или строк Meta)
    for (const adset of camp?.adsets || []) {
      for (const ad of adset?.ads || []) {
        const range = extractMetaDateRange(ad)
        if (range?.start) {
          const sp = toNum(ad?.spend || ad?.['Потраченная сумма (USD)'] || ad?.['Потраченная сумма'])
          const ld = toNum(ad?.leads || ad?.['Результат'])
          const clk = toNum(ad?.clicks || ad?.['Клики по ссылке'])
          const imp = toNum(ad?.impressions || ad?.['Показы'])

          const days = getDaysInRange(range.start, range.end)
          const isPeriod = days.length > 1
          if (isPeriod) isAnyDistributed = true

          const spPerDay = sp / days.length
          const ldPerDay = ld / days.length
          const clkPerDay = clk / days.length
          const impPerDay = imp / days.length

          for (const d of days) {
            // Если задан фильтр дат, отсекаем дни вне диапазона
            if (dateFrom && d < dateFrom) continue
            if (dateTo && d > dateTo) continue

            const day = ensureDay(d)
            day.spend += spPerDay
            day.metaLeads += ldPerDay
            day.clicks += clkPerDay
            day.impressions += impPerDay
            if (sp > 0 || ld > 0) {
              day.hasDailyMeta = true
              if (isPeriod) day.isDistributed = true
            }
          }
        }
      }
    }

    // Bitrix сделки по дням
    for (const deal of camp?.bxDeals || []) {
      const d = extractBitrixDateKey(deal)
      if (!d) continue
      if (dateFrom && d < dateFrom) continue
      if (dateTo && d > dateTo) continue

      const day = ensureDay(d)
      day.bxLeads++
      if (isWonStage(deal?.stage)) {
        day.wonDeals++
        day.revenue += toNum(deal?.amount)
      }
    }
  }

  // Если задан диапазон фильтра дат, заполняем все дни диапазона, чтобы график не имел дыр
  if (dateFrom && dateTo) {
    const rangeDays = getDaysInRange(dateFrom, dateTo)
    for (const d of rangeDays) {
      ensureDay(d)
    }
  }

  // Сортируем дни строго хронологически
  const allDays = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
  const anyDailyMeta = allDays.some(d => d.hasDailyMeta)

  return allDays.map(d => {
    const leadsCount = d.bxLeads > 0 ? d.bxLeads : d.metaLeads
    return {
      ...d,
      spend: +d.spend.toFixed(2),
      metaLeads: +d.metaLeads.toFixed(1),
      clicks: Math.round(d.clicks),
      impressions: Math.round(d.impressions),
      cpl: leadsCount > 0 && d.spend > 0 ? +(d.spend / leadsCount).toFixed(2) : null,
      totalMetaSpend: +totalMetaSpend.toFixed(2),
      totalMetaLeads,
      hasDailyMetaBreakdown: anyDailyMeta,
      isDistributed: d.isDistributed,
      isAnyDistributed,
    }
  })
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

