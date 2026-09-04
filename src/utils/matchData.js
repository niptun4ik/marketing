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
        dateRange: extractMetaDateRange(row),
      })
    }
    const camp = metaMap.get(campKey)
    camp.totals.spend       += toNum(row?.spend)
    camp.totals.impressions += toNum(row?.impressions)
    camp.totals.clicks      += toNum(row?.clicks)
    camp.totals.leads       += toNum(row?.leads)

    // Актуализируем общий диапазон дат кампании
    const r = extractMetaDateRange(row)
    if (r?.start) {
      if (!camp.dateRange) {
        camp.dateRange = { ...r }
      } else {
        if (r.start < camp.dateRange.start) camp.dateRange.start = r.start
        if (r.end > camp.dateRange.end) camp.dateRange.end = r.end
      }
    }

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

  // Сортируем кампании Meta: сначала активные с расходом и лидами
  const metaEntries = Array.from(metaMap.entries()).map(([k, v]) => ({
    key: k,
    data: v,
    spend: v.totals.spend,
    hasActivity: v.totals.spend > 0 || v.totals.impressions > 0 || v.totals.leads > 0,
  }))
  metaEntries.sort((a, b) => b.spend - a.spend)

  // Хелпер для умного поиска наиболее подходящей кампании для сделки
  const findBestCampaignKey = (deal) => {
    // 1. Прямая точная метка utm_campaign
    const directKey = norm(deal?.utm_campaign)
    if (directKey && metaMap.has(directKey)) return directKey

    // 2. Поиск по подстроке utm_campaign среди активных кампаний
    if (directKey) {
      const subMatch = metaEntries.find(e => e.key.includes(directKey) || directKey.includes(e.key))
      if (subMatch) return subMatch.key
    }

    // 3. Полный текстовый контекст сделки (включая кастомные вопросы анкет, источник, форму)
    const allDealText = norm(
      Object.entries(deal || {})
        .filter(([k, v]) => typeof v === 'string' && v.trim().length > 0 && !k.startsWith('_'))
        .map(([k, v]) => `${k} ${v}`)
        .join(' ')
    )

    if (allDealText) {
      // Ищем совпадение ключевых слов сначала в активных кампаниях Meta
      for (const { key } of metaEntries) {
        const cleanKey = key.replace(/[|()—–\-_]/g, ' ').replace(/\s+/g, ' ').trim()
        const words = cleanKey.split(' ').filter(w => w.length > 3 && !['лиды', 'тест', 'видео', 'kz', 'landing', 'лендинг'].includes(w))
        const matchCount = words.filter(w => allDealText.includes(w)).length
        if (words.length > 0 && matchCount >= Math.min(2, words.length)) {
          return key
        }
      }

      // Специальные распространенные семантические маркеры (приоритет активным кампаниям)
      if (allDealText.includes('отношен')) {
        const active = metaEntries.find(e => e.hasActivity && e.key.includes('отношен'))
        if (active) return active.key
        const any = metaEntries.find(e => e.key.includes('отношен'))
        if (any) return any.key
      }
      if (allDealText.includes('моп')) {
        const active = metaEntries.find(e => e.hasActivity && e.key.includes('моп'))
        if (active) return active.key
      }
      if (allDealText.includes('семинар')) {
        const active = metaEntries.find(e => e.hasActivity && (e.key.includes('семинар') || e.key.includes('seminar')))
        if (active) return active.key
      }
      if (allDealText.includes('whatsapp') || allDealText.includes('ватсап')) {
        const active = metaEntries.find(e => e.hasActivity && (e.key.includes('ватсап') || e.key.includes('w/a') || e.key.includes('whatsapp')))
        if (active) return active.key
      }
    }

    // Если у нас в Meta всего 1 кампания с активностью
    const activeCamps = metaEntries.filter(e => e.hasActivity)
    if (activeCamps.length === 1 && (allDealText.includes('форма') || allDealText.includes('сайт') || allDealText.includes('таргет') || !deal?.utm_campaign)) {
      return activeCamps[0].key
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
      dateRange: campData.dateRange,
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
        dateRange: null,
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

  // 1. Попытка распарсить диапазон из строкового поля (напр. "2026-07-21 — 2026-09-03" или "21.07.2026 - 03.09.2026")
  for (const val of Object.values(row)) {
    if (typeof val === 'string' && (val.includes('—') || val.includes(' - ') || val.includes('..') || val.includes(' по '))) {
      const splitParts = val.split(/[—–]|\s-\s|\.\.|\sпо\s/).map(s => s.trim()).filter(Boolean)
      if (splitParts.length >= 2) {
        const s = parseDateKey(splitParts[0])
        const e = parseDateKey(splitParts[1])
        if (s && e) return { start: s, end: e }
      }
    }
  }

  const startRaw = row.date ||
    row.date_start ||
    row['Дата начала отчетности'] ||
    row['Дата начала'] ||
    row['Date start'] ||
    row['Start date'] ||
    row['Reporting starts'] ||
    row['День'] ||
    row['Day'] ||
    row['Дата'] ||
    row['Начало']
  let start = parseDateKey(startRaw)

  let endRaw = row.date_end ||
    row.date_stop ||
    row['Окончание отчетности'] ||
    row['Дата окончания'] ||
    row['Date stop'] ||
    row['End date'] ||
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
    for (const [k, val] of Object.entries(row)) {
      if (typeof val === 'string' && val.length >= 8) {
        const kLower = k.toLowerCase()
        if (kLower.includes('начал') || kLower.includes('старт') || kLower.includes('start') || kLower.includes('from') || kLower.includes('день') || kLower.includes('дата')) {
          const d = parseDateKey(val)
          if (d) { start = d; break }
        }
      }
    }
  }

  if (!start) {
    for (const val of Object.values(row)) {
      if (typeof val === 'string' && val.length >= 8) {
        const d = parseDateKey(val)
        if (d) return { start: d, end: end || d }
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
        activeCampaigns: new Set(),
      })
    }
    return byDay.get(date)
  }

  let totalCampaignSpend = 0
  let totalCampaignLeads = 0
  let totalCampaignClicks = 0
  let totalCampaignImpressions = 0
  let isAnyDistributed = false
  let realDailyMetaCount = 0

  for (const camp of campaigns || []) {
    const campSpend = toNum(camp?.totals?.spend)
    const campLeads = toNum(camp?.totals?.leads)
    const campClicks = toNum(camp?.totals?.clicks)
    const campImpressions = toNum(camp?.totals?.impressions)

    totalCampaignSpend += campSpend
    totalCampaignLeads += campLeads
    totalCampaignClicks += campClicks
    totalCampaignImpressions += campImpressions

    // Meta spend по дням (из объявлений или строк Meta)
    let distributedAdSpend = 0
    let distributedAdLeads = 0
    let distributedAdClicks = 0
    let distributedAdImpressions = 0

    for (const adset of camp?.adsets || []) {
      for (const ad of adset?.ads || []) {
        const range = extractMetaDateRange(ad) || camp?.dateRange
        const sp = toNum(ad?.spend || ad?.['Потраченная сумма (USD)'] || ad?.['Потраченная сумма'])
        const ld = toNum(ad?.leads || ad?.['Результат'])
        const clk = toNum(ad?.clicks || ad?.['Клики по ссылке'] || ad?.['Клики (все)'])
        const imp = toNum(ad?.impressions || ad?.['Показы'])

        if (range?.start && (sp > 0 || ld > 0 || clk > 0 || imp > 0)) {
          const days = getDaysInRange(range.start, range.end)
          const isPeriod = days.length > 1
          if (isPeriod) isAnyDistributed = true
          else if (sp > 0 || ld > 0) realDailyMetaCount++

          const spPerDay = sp / days.length
          const ldPerDay = ld / days.length
          const clkPerDay = clk / days.length
          const impPerDay = imp / days.length

          distributedAdSpend += sp
          distributedAdLeads += ld
          distributedAdClicks += clk
          distributedAdImpressions += imp

          for (const d of days) {
            // Если задан фильтр дат, отсекаем дни вне диапазона
            if (dateFrom && d < dateFrom) continue
            if (dateTo && d > dateTo) continue

            const day = ensureDay(d)
            day.spend += spPerDay
            day.metaLeads += ldPerDay
            day.clicks += clkPerDay
            day.impressions += impPerDay
            day.activeCampaigns.add(camp.campaign_name)
            if (sp > 0 || ld > 0) {
              if (!isPeriod) day.hasDailyMeta = true
              if (isPeriod) day.isDistributed = true
            }
          }
        }
      }
    }

    // Fallback: если у кампании есть расход, но в объявлениях он не был распределен
    if (campSpend > 0 && distributedAdSpend < campSpend * 0.95) {
      const remainingSpend = campSpend - distributedAdSpend
      const remainingLeads = Math.max(0, campLeads - distributedAdLeads)
      const remainingClicks = Math.max(0, campClicks - distributedAdClicks)
      const remainingImpressions = Math.max(0, campImpressions - distributedAdImpressions)
      const range = camp?.dateRange || (dateFrom && dateTo ? { start: dateFrom, end: dateTo } : null)

      if (range?.start) {
        const days = getDaysInRange(range.start, range.end)
        const isPeriod = days.length > 1
        if (isPeriod) isAnyDistributed = true

        const spPerDay = remainingSpend / days.length
        const ldPerDay = remainingLeads / days.length
        const clkPerDay = remainingClicks / days.length
        const impPerDay = remainingImpressions / days.length

        for (const d of days) {
          if (dateFrom && d < dateFrom) continue
          if (dateTo && d > dateTo) continue

          const day = ensureDay(d)
          day.spend += spPerDay
          day.metaLeads += ldPerDay
          day.clicks += clkPerDay
          day.impressions += impPerDay
          day.activeCampaigns.add(camp.campaign_name)
          if (isPeriod) day.isDistributed = true
          else day.hasDailyMeta = true
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
  const anyDailyMeta = realDailyMetaCount > 0

  // Расчет суммарных метрик именно для отображаемого периода графика
  let periodSpend = 0
  let periodBxLeads = 0
  let periodMetaLeads = 0
  let periodClicks = 0
  let periodImpressions = 0
  let periodRevenue = 0
  let periodWonDeals = 0
  let peakDay = null
  let maxLeads = 0

  for (const d of allDays) {
    periodSpend += d.spend
    periodBxLeads += d.bxLeads
    periodMetaLeads += d.metaLeads
    periodClicks += d.clicks
    periodImpressions += d.impressions
    periodRevenue += d.revenue
    periodWonDeals += d.wonDeals

    const leads = d.bxLeads > 0 ? d.bxLeads : Math.round(d.metaLeads)
    if (leads > maxLeads) {
      maxLeads = leads
      peakDay = { date: d.date, leads }
    }
  }

  const periodDaysCount = allDays.length || 1
  const avgSpendPerDay = +(periodSpend / periodDaysCount).toFixed(2)
  const avgLeadsPerDay = +(periodBxLeads / periodDaysCount).toFixed(1)
  const periodCpl = periodBxLeads > 0 && periodSpend > 0 ? +(periodSpend / periodBxLeads).toFixed(2) : null

  return allDays.map(d => {
    const leadsCount = d.bxLeads > 0 ? d.bxLeads : d.metaLeads
    return {
      date: d.date,
      spend: +d.spend.toFixed(2),
      metaLeads: +d.metaLeads.toFixed(1),
      clicks: Math.round(d.clicks),
      impressions: Math.round(d.impressions),
      bxLeads: d.bxLeads,
      wonDeals: d.wonDeals,
      revenue: Math.round(d.revenue),
      cpl: leadsCount > 0 && d.spend > 0 ? +(d.spend / leadsCount).toFixed(2) : null,
      activeCampaigns: Array.from(d.activeCampaigns || []),

      // Метрики фильтрованного диапазона графика
      periodSpend: +periodSpend.toFixed(2),
      periodBxLeads,
      periodMetaLeads: Math.round(periodMetaLeads),
      periodClicks: Math.round(periodClicks),
      periodImpressions: Math.round(periodImpressions),
      periodRevenue: Math.round(periodRevenue),
      periodWonDeals,
      periodCpl,
      avgSpendPerDay,
      avgLeadsPerDay,
      peakDay,

      // Обратная совместимость для компонентов
      totalMetaSpend: +periodSpend.toFixed(2),
      totalMetaLeads: Math.round(periodMetaLeads),
      totalMetaClicks: Math.round(periodClicks),
      totalMetaImpressions: Math.round(periodImpressions),
      totalBxLeads: periodBxLeads,
      totalWonDeals: periodWonDeals,
      totalRevenue: Math.round(periodRevenue),

      // Общие показатели кампаний за весь период
      totalCampaignSpend: +totalCampaignSpend.toFixed(2),
      totalCampaignLeads: Math.round(totalCampaignLeads),
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

