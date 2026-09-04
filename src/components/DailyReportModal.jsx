// components/DailyReportModal.jsx
import { useState, useMemo, useEffect } from 'react'
import { X, Copy, Check, MessageSquare, Calendar, BarChart3, ArrowDownUp, EyeOff } from 'lucide-react'
import {
  toNum,
  isWonStage,
  norm,
  parseDateKey,
  extractMetaDateKey,
  extractMetaDateRange,
  getDaysInRange,
  extractBitrixDateKey,
  formatRuDate,
  formatRuShort,
  formatRuFullDate,
} from '../utils/matchData'

export default function DailyReportModal({
  isOpen,
  onClose,
  metaRows = [],
  bitrixRows = [],
  campaigns = [],
  totals,
  usdRate = 500,
  hiddenCampaigns = [],
}) {
  const [mode, setMode] = useState('day') // 'day' | 'period'
  const [sortAsc, setSortAsc] = useState(false) // false: от новых к старым, true: от старых к новым
  const [copied, setCopied] = useState(false)

  // 0. Множество скрытых кампаний (нормализованное)
  const hiddenNormSet = useMemo(() => new Set((hiddenCampaigns || []).map(norm)), [hiddenCampaigns])

  // Фильтруем Meta-строки: исключаем скрытые кампании
  const effectiveMetaRows = useMemo(() => {
    if (!hiddenNormSet.size) return metaRows || []
    return (metaRows || []).filter(r => {
      const name = norm(r?.campaign_name || r?.['Название кампании'])
      return !hiddenNormSet.has(name)
    })
  }, [metaRows, hiddenNormSet])

  // Фильтруем Bitrix-сделки: берем сделки из видимых кампаний (или bitrixRows, если переданы уже отфильтрованные)
  const effectiveBitrixRows = useMemo(() => {
    if (campaigns && campaigns.length > 0) {
      return campaigns
        .filter(c => !hiddenNormSet.has(norm(c.campaign_name)))
        .flatMap(c => c?.bxDeals || [])
    }
    return bitrixRows || []
  }, [campaigns, bitrixRows, hiddenNormSet])

  // 1. Сводные показатели по всем Meta-кампаниям (гарантирует наличие отчета Meta всегда)
  const metaCampaignsSummary = useMemo(() => {
    // Приоритет: уже объединенные и очищенные кампании
    if (campaigns && campaigns.length > 0) {
      const list = campaigns
        .filter(c => !c.unmatched && !hiddenNormSet.has(norm(c.campaign_name)) && (toNum(c?.totals?.spend) > 0 || toNum(c?.totals?.leads) > 0))
        .map(c => {
          const spend = toNum(c?.totals?.spend)
          const clicks = toNum(c?.totals?.clicks)
          const impressions = toNum(c?.totals?.impressions)
          const metaLeads = toNum(c?.totals?.leads)
          const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0'
          const cpl = metaLeads > 0 && spend > 0 ? (spend / metaLeads).toFixed(2) : '—'
          return { name: c.campaign_name, spend, clicks, impressions, metaLeads, ctr, cpl }
        })
      if (list.length > 0) return list
    }

    // Фолбэк на строки Meta
    const campMap = new Map()
    for (const r of effectiveMetaRows || []) {
      const name = String(r?.campaign_name || r['Название кампании'] || '(без кампании)').trim()
      const key = norm(name)
      if (hiddenNormSet.has(key)) continue
      if (!campMap.has(key)) campMap.set(key, { name, spend: 0, clicks: 0, impressions: 0, metaLeads: 0 })
      const c = campMap.get(key)
      c.spend       += toNum(r?.spend || r['Потраченная сумма (USD)'] || r['Потраченная сумма'])
      c.clicks      += toNum(r?.clicks || r['Клики по ссылке'])
      c.impressions += toNum(r?.impressions || r['Показы'])
      c.metaLeads   += toNum(r?.leads || r['Результат'])
    }
    return Array.from(campMap.values()).map(c => {
      const cpl = c.metaLeads > 0 && c.spend > 0 ? (c.spend / c.metaLeads).toFixed(2) : '—'
      const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0'
      return { ...c, cpl, ctr }
    })
  }, [campaigns, effectiveMetaRows, hiddenNormSet])

  // 2. Определение периода Meta Ads
  const metaPeriod = useMemo(() => {
    let minDate = null
    let maxDate = null

    for (const r of effectiveMetaRows || []) {
      const start = extractMetaDateKey(r)
      const stopRaw = r.date_end || r['Окончание отчетности'] || r['Дата окончания'] || r['Date stop'] || r['Reporting ends']
      const stop = parseDateKey(stopRaw) || start

      if (start) {
        if (!minDate || start < minDate) minDate = start
      }
      if (stop) {
        if (!maxDate || stop > maxDate) maxDate = stop
      }
    }

    if (!minDate) return null
    return { from: minDate, to: maxDate || minDate }
  }, [effectiveMetaRows])

  // 3. Собираем реальные доступные даты из Bitrix и Meta в строгом хронологическом порядке
  const availableDates = useMemo(() => {
    const map = new Map()

    for (const r of effectiveMetaRows || []) {
      const rng = extractMetaDateRange(r)
      const start = rng?.start || metaPeriod?.from
      const end = (rng?.end && rng.end !== rng.start) ? rng.end : (metaPeriod?.to || start)
      if (start) {
        const days = getDaysInRange(start, end)
        for (const d of days) {
          if (!map.has(d)) map.set(d, { metaCount: 0, bxCount: 0 })
          map.get(d).metaCount++
        }
      }
    }

    // Если в metaPeriod есть даты, гарантируем их присутствие в карте
    if (metaPeriod?.from && metaPeriod?.to) {
      const pDays = getDaysInRange(metaPeriod.from, metaPeriod.to)
      for (const d of pDays) {
        if (!map.has(d)) map.set(d, { metaCount: 0, bxCount: 0 })
        map.get(d).metaCount = Math.max(1, map.get(d).metaCount)
      }
    }

    for (const d of effectiveBitrixRows || []) {
      const k = extractBitrixDateKey(d)
      if (k) {
        if (!map.has(k)) map.set(k, { metaCount: 0, bxCount: 0 })
        map.get(k).bxCount++
      }
    }

    const arr = Array.from(map.entries()).map(([dateKey, stats]) => {
      const formatted = formatRuDate(dateKey)
      const shortText = formatRuShort(dateKey)
      let tag = ''
      if (stats.metaCount > 0 && stats.bxCount > 0) {
        tag = `Meta Ads + CRM (${stats.bxCount} лид.)`
      } else if (stats.metaCount > 0) {
        tag = `Meta Ads`
      } else {
        tag = `CRM (${stats.bxCount} лид.)`
      }

      return {
        dateKey,
        formatted,
        shortText,
        tag,
        label: `${formatted} (${shortText}) — ${tag}`,
        stats,
      }
    })

    // Сортировка: по умолчанию от новых к старым (или наоборот при переключении)
    arr.sort((a, b) => sortAsc ? a.dateKey.localeCompare(b.dateKey) : b.dateKey.localeCompare(a.dateKey))
    return arr
  }, [effectiveBitrixRows, effectiveMetaRows, metaPeriod, sortAsc])

  const [selectedKey, setSelectedKey] = useState('')

  useEffect(() => {
    if (availableDates.length > 0 && (!selectedKey || !availableDates.some(d => d.dateKey === selectedKey))) {
      setSelectedKey(availableDates[0].dateKey)
    }
  }, [availableDates, selectedKey])

  // 4. Расчет данных для выбранного дня
  const dailyData = useMemo(() => {
    if (!selectedKey) return null

    // Сделки Bitrix за выбранный день (только активные/видимые кампании)
    const deals = (effectiveBitrixRows || []).filter(d => extractBitrixDateKey(d) === selectedKey)
    const paidDeals = deals.filter(d => isWonStage(d?.stage))
    const revenue = paidDeals.reduce((sum, d) => sum + toNum(d?.amount), 0)

    // Meta за выбранный день (только активные/видимые кампании):
    // 1) Ищем строки с точной датой (если выгрузка была разбита по дням)
    const exactDayRows = (effectiveMetaRows || []).filter(r => {
      const rng = extractMetaDateRange(r)
      return rng && rng.start === selectedKey && rng.end === selectedKey
    })

    let spend = 0
    let clicks = 0
    let impressions = 0
    let metaLeads = 0
    let isDistributed = false
    const campaignNames = new Set()

    if (exactDayRows.length > 0) {
      for (const r of exactDayRows) {
        spend += toNum(r.spend || r['Потраченная сумма (USD)'] || r['Потраченная сумма'])
        clicks += toNum(r.clicks || r['Клики по ссылке'] || r['Клики (все)'])
        impressions += toNum(r.impressions || r['Показы'])
        metaLeads += toNum(r.leads || r['Результат'])
        const name = r.campaign_name || r['Название кампании']
        if (name && !hiddenNormSet.has(norm(name))) campaignNames.add(String(name).trim())
      }
    } else {
      // 2) Если точных строк по дням нет, проверяем кампании, в чей диапазон попадает этот день
      for (const r of effectiveMetaRows || []) {
        const rng = extractMetaDateRange(r)
        const start = rng?.start || metaPeriod?.from
        const end = (rng?.end && rng.end !== rng.start) ? rng.end : (metaPeriod?.to || start)
        if (!start) continue

        const days = getDaysInRange(start, end)
        if (days.includes(selectedKey)) {
          isDistributed = true
          const daysCount = Math.max(1, days.length)
          const rSpend = toNum(r.spend || r['Потраченная сумма (USD)'] || r['Потраченная сумма'])
          const rClicks = toNum(r.clicks || r['Клики по ссылке'] || r['Клики (все)'])
          const rImp = toNum(r.impressions || r['Показы'])
          const rLeads = toNum(r.leads || r['Результат'])

          spend += rSpend / daysCount
          clicks += rClicks / daysCount
          impressions += rImp / daysCount
          metaLeads += rLeads / daysCount

          const name = r.campaign_name || r['Название кампании']
          if (name && !hiddenNormSet.has(norm(name)) && (rSpend > 0 || rClicks > 0 || rLeads > 0)) {
            campaignNames.add(String(name).trim())
          }
        }
      }

      // 3) Фолбэк на объединенные campaigns, если по строкам расход не распределился
      if (spend === 0 && campaigns?.length > 0 && metaPeriod?.from && metaPeriod?.to) {
        const pDays = getDaysInRange(metaPeriod.from, metaPeriod.to)
        if (pDays.includes(selectedKey)) {
          isDistributed = true
          const daysCount = Math.max(1, pDays.length)
          for (const c of campaigns) {
            if (c.unmatched || hiddenNormSet.has(norm(c.campaign_name))) continue
            const cSpend = toNum(c?.totals?.spend)
            const cClicks = toNum(c?.totals?.clicks)
            const cLeads = toNum(c?.totals?.leads)
            if (cSpend > 0 || cClicks > 0 || cLeads > 0) {
              spend += cSpend / daysCount
              clicks += cClicks / daysCount
              impressions += toNum(c?.totals?.impressions) / daysCount
              metaLeads += cLeads / daysCount
              if (c.campaign_name) campaignNames.add(String(c.campaign_name).trim())
            }
          }
        }
      }
    }

    const hasMeta = spend > 0 || clicks > 0 || impressions > 0
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0'
    const totalLeadsForDay = deals.length > 0 ? deals.length : Math.round(metaLeads)
    const cpl = totalLeadsForDay > 0 && spend > 0 ? (spend / totalLeadsForDay).toFixed(2) : '—'
    const spendInKzt = spend * (usdRate || 500)
    const roas = spendInKzt > 0 && revenue > 0 ? (((revenue - spendInKzt) / spendInKzt) * 100).toFixed(0) : null

    return {
      date: formatRuDate(selectedKey),
      shortText: formatRuShort(selectedKey),
      dealsCount: deals.length,
      paidCount: paidDeals.length,
      revenue,
      hasMeta,
      spend,
      clicks: Math.round(clicks),
      impressions: Math.round(impressions),
      metaLeads: Math.round(metaLeads),
      ctr,
      cpl,
      roas,
      isDistributed,
      campaignNames: Array.from(campaignNames),
    }
  }, [selectedKey, effectiveMetaRows, effectiveBitrixRows, campaigns, metaPeriod, hiddenNormSet, usdRate])

  // 5. Расчет данных для сводного отчета за весь период
  const periodData = useMemo(() => {
    const totalSpend = metaCampaignsSummary.reduce((s, i) => s + i.spend, 0)
    const totalClicks = metaCampaignsSummary.reduce((s, i) => s + i.clicks, 0)
    const totalMetaLeads = metaCampaignsSummary.reduce((s, i) => s + i.metaLeads, 0)
    const totalBxDeals = (effectiveBitrixRows || []).length
    const wonDeals = (effectiveBitrixRows || []).filter(d => isWonStage(d?.stage)).length
    const totalRevenue = (effectiveBitrixRows || []).filter(d => isWonStage(d?.stage)).reduce((s, d) => s + toNum(d?.amount), 0)

    const cpl = totalMetaLeads > 0 && totalSpend > 0 ? (totalSpend / totalMetaLeads).toFixed(2) : '—'
    const cpo = wonDeals > 0 && totalSpend > 0 ? (totalSpend / wonDeals).toFixed(2) : '—'
    const spendInKzt = totalSpend * (usdRate || 500)
    const roas = spendInKzt > 0 ? (((totalRevenue - spendInKzt) / spendInKzt) * 100).toFixed(0) : '0'

    return {
      totalSpend,
      totalClicks,
      totalMetaLeads,
      totalBxDeals,
      wonDeals,
      totalRevenue,
      cpl,
      cpo,
      roas,
    }
  }, [metaCampaignsSummary, effectiveBitrixRows, usdRate])

  // 6. Формирование текста отчета для Telegram / WhatsApp
  const reportText = useMemo(() => {
    if (mode === 'day') {
      if (!dailyData) return 'Выберите дату для формирования отчета.'

      let t = `📊 Отчет по маркетингу за ${dailyData.date} (${dailyData.shortText})\n\n`

      // ─── META ADS ───
      t += `—— META ADS ——\n`
      if (dailyData.hasMeta) {
        if (dailyData.campaignNames.length > 0) {
          for (const name of dailyData.campaignNames) {
            t += `📍 ${name}\n`
          }
        }
        t += `Расход: ${dailyData.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
        if (dailyData.isDistributed) {
          t += ` (распред. за день)`
        }
        t += `\n`
        t += `Клики: ${dailyData.clicks}  CTR: ${dailyData.ctr}%\n`
        if (dailyData.metaLeads > 0) {
          t += `Лидов (Meta): ${dailyData.metaLeads}\n`
        }
        t += `\n`
      } else {
        t += `Реклама в этот день не крутилась / нет данных\n\n`
      }

      // ─── CRM / BITRIX ───
      t += `—— CRM / BITRIX за ${dailyData.date} ——\n`
      t += `Новых сделок: ${dailyData.dealsCount}\n`
      t += `Оплат: ${dailyData.paidCount}\n`
      if (dailyData.revenue > 0) {
        t += `Выручка: ${dailyData.revenue.toLocaleString('ru-RU')} ₸\n`
      }
      if (dailyData.cpl !== '—') {
        t += `CPL (цена лида): ${dailyData.cpl} $\n`
      }
      if (dailyData.roas !== null) {
        t += `ROAS за день: ${dailyData.roas}%\n`
      }

      return t.trim()
    } else {
      // ─── СВОДНЫЙ ОТЧЕТ ЗА ВЕСЬ ПЕРИОД ───
      const pFrom = metaPeriod?.from ? formatRuDate(metaPeriod.from) : ''
      const pTo   = metaPeriod?.to   ? formatRuDate(metaPeriod.to)   : ''
      const periodLabel = pFrom && pTo ? ` (${pFrom} – ${pTo})` : ''

      let t = `📊 Сводный отчет по рекламе и продажам${periodLabel}\n\n`

      t += `—— РЕКЛАМА META ADS ——\n`
      for (const item of metaCampaignsSummary) {
        t += `📍 ${item.name}\n`
        t += `Расход: ${item.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} $\n`
        t += `Клики: ${item.clicks}  CTR: ${item.ctr}%\n`
        t += `Лидов (Meta): ${item.metaLeads}  CPL: ${item.cpl} $\n\n`
      }

      t += `—— РЕЗУЛЬТАТЫ В CRM ——\n`
      t += `Всего сделок в CRM: ${periodData.totalBxDeals}\n`
      t += `Успешных оплат: ${periodData.wonDeals}\n`
      t += `Выручка: ${periodData.totalRevenue.toLocaleString('ru-RU')} ₸\n`
      if (periodData.wonDeals > 0) {
        t += `CPO (цена клиента): ${periodData.cpo} $\n`
        t += `ROAS: ${periodData.roas}%\n`
      }
      t += `\nКурс пересчета: 1$ = ${usdRate} ₸`

      return t.trim()
    }
  }, [mode, dailyData, metaCampaignsSummary, periodData, metaPeriod, usdRate])

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageSquare size={15} className="text-zinc-600 dark:text-zinc-400 shrink-0" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Готовый отчет по маркетингу
            </h3>
            {hiddenCampaigns.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 px-2 py-0.5 rounded-full font-medium ml-1" title="Скрытые в таблице кампании не учитываются в отчете">
                <EyeOff size={10} />
                Скрыто кампаний: {hiddenCampaigns.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
            <X size={15} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3.5 pb-1">
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setMode('day')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                mode === 'day'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Calendar size={13} />
              <span>За выбранный день</span>
            </button>
            <button
              onClick={() => setMode('period')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                mode === 'period'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <BarChart3 size={13} />
              <span>Сводный за период кампании</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {mode === 'day' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Выберите день отчета:
                </label>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  title="Изменить порядок сортировки дат"
                >
                  <ArrowDownUp size={11} />
                  <span>{sortAsc ? 'Сначала старые' : 'Сначала новые'}</span>
                </button>
              </div>

              {availableDates.length > 0 ? (
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="select-base text-xs py-1.5 font-medium w-full"
                >
                  {availableDates.map(d => (
                    <option key={d.dateKey} value={d.dateKey}>
                      {d.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-zinc-400">Нет доступных дат</p>
              )}

              {dailyData?.isDistributed && (
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 inline-block" />
                  <span>Кампания Meta распределена равномерно по активным дням (~{dailyData.spend.toFixed(2)} $/день).</span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300">
              Сводка по всем расходам Meta Ads за период{' '}
              {metaPeriod ? `с ${formatRuDate(metaPeriod.from)} по ${formatRuDate(metaPeriod.to)}` : ''}{' '}
              и всем сделкам CRM.
            </div>
          )}

          {/* Formatted Text Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Текст для отправки (Telegram / WhatsApp):
              </label>
              <span className="text-[10px] text-zinc-400">
                Готово для вставки
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4 border border-zinc-200/80 dark:border-zinc-700/80 font-mono text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">
              {reportText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-400">Скопируйте и отправьте в чат команды</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">
              Закрыть
            </button>
            <button
              onClick={handleCopy}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Скопировано!' : 'Скопировать отчет'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

