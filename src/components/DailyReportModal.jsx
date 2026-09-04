// components/DailyReportModal.jsx
import { useState, useMemo, useEffect } from 'react'
import { X, Copy, Check, MessageSquare } from 'lucide-react'
import { toNum, isWonStage, norm } from '../utils/matchData'

/**
 * Точный парсер для дат из файлов Bitrix24 и Meta Ads.
 * Приоритет: русский формат ДД.ММ.ГГГГ, ISO ГГГГ-ММ-ДД.
 * Всегда возвращает ключ 'YYYY-MM-DD' для надежного сопоставления.
 */
export const parseDateKey = (raw) => {
  if (!raw) return null
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split('T')[0]
  }

  const s = String(raw).trim()

  // 1. Формат DD.MM.YYYY или DD/MM/YYYY (например "19.08.2026", "19.08.2026 14:30")
  const ruMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (ruMatch) {
    const [, d, m, y] = ruMatch
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // 2. Формат YYYY-MM-DD (например "2026-08-19")
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return null
}

/** Превращает 'YYYY-MM-DD' в красивое '19.08.2026' */
const formatRuDate = (key) => {
  if (!key) return ''
  const [y, m, d] = key.split('-')
  return `${d}.${m}.${y}`
}

export default function DailyReportModal({ isOpen, onClose, metaRows = [], bitrixRows = [], campaigns = [] }) {
  // 1. Собираем реальные доступные даты из Bitrix и Meta
  const availableDates = useMemo(() => {
    const counts = new Map()
    const addDate = (d) => {
      const key = parseDateKey(d)
      if (key) counts.set(key, (counts.get(key) || 0) + 1)
    }

    bitrixRows.forEach(r => addDate(r?.created_date))
    metaRows.forEach(r => addDate(r?.date))

    return Array.from(counts.entries())
      .map(([dateKey, count]) => ({
        dateKey,
        formatted: formatRuDate(dateKey),
        count,
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey)) // самые свежие сверху
  }, [bitrixRows, metaRows])

  // По умолчанию выбираем самый свежий день из данных
  const [selectedKey, setSelectedKey] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.some(d => d.dateKey === selectedKey)) {
      setSelectedKey(availableDates[0].dateKey)
    }
  }, [availableDates, selectedKey])

  // Определяем период Meta файла (для пометки в отчёте)
  const metaPeriod = useMemo(() => {
    const dates = (metaRows || []).map(r => parseDateKey(r?.date)).filter(Boolean).sort()
    if (!dates.length) return null
    return { from: dates[0], to: dates[dates.length - 1] }
  }, [metaRows])

  // Реальный расчет: Meta — итоги за период, Bitrix — только за выбранный день
  const reportData = useMemo(() => {
    if (!selectedKey) return { items: [], bxDeals: [], hasDailyMeta: false }

    // Bitrix: сделки только за выбранный день
    const dayDeals = (bitrixRows || []).filter(d => parseDateKey(d?.created_date) === selectedKey)

    // Meta: если файл содержит строки за конкретный день — берём их
    //       если нет (отчёт за период) — берём ВСЕ строки с пометкой «за период»
    const dayMeta = (metaRows || []).filter(r => parseDateKey(r?.date) === selectedKey)
    const hasDailyMeta = dayMeta.length > 0
    const metaSource = hasDailyMeta ? dayMeta : (metaRows || [])

    // Агрегируем Meta по кампаниям
    const campMap = new Map()
    for (const row of metaSource) {
      const name = row?.campaign_name || '(без кампании)'
      const key = name.toLowerCase().trim()
      if (!campMap.has(key)) campMap.set(key, { name, spend: 0, clicks: 0, impressions: 0, metaLeads: 0 })
      const c = campMap.get(key)
      c.spend       += toNum(row?.spend)
      c.clicks      += toNum(row?.clicks)
      c.impressions += toNum(row?.impressions)
      c.metaLeads   += toNum(row?.leads)
    }

    // Добавляем Bitrix сделки за день
    const bxByCamp = {}
    for (const deal of dayDeals) {
      const key = (deal?.utm_campaign || '').toLowerCase().trim() || '__unknown__'
      if (!bxByCamp[key]) bxByCamp[key] = []
      bxByCamp[key].push(deal)
    }

    const items = Array.from(campMap.values())
      .filter(c => c.spend > 0 || c.metaLeads > 0)
      .map(c => {
        const key = c.name.toLowerCase().trim()
        const deals = bxByCamp[key] || []
        const paidDeals = deals.filter(d => isWonStage(d?.stage))
        const revenue = paidDeals.reduce((s, d) => s + toNum(d?.amount), 0)
        const cpl = c.metaLeads > 0 && c.spend > 0 ? (c.spend / c.metaLeads).toFixed(2) : '—'
        const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0'
        return { ...c, deals: deals.length, paidDeals: paidDeals.length, revenue, cpl, ctr }
      })

    // Все Bitrix сделки за день (для итогового блока)
    const totalBxPaid = dayDeals.filter(d => isWonStage(d?.stage))
    const totalRevenue = totalBxPaid.reduce((s, d) => s + toNum(d?.amount), 0)

    const totals = items.reduce((acc, i) => ({
      spend: acc.spend + i.spend,
      clicks: acc.clicks + i.clicks,
      metaLeads: acc.metaLeads + i.metaLeads,
    }), { spend: 0, clicks: 0, metaLeads: 0 })

    return { items, bxDeals: dayDeals, hasDailyMeta, totals, totalBxPaid: totalBxPaid.length, totalRevenue }
  }, [selectedKey, metaRows, bitrixRows])

  // Текст отчёта
  const reportText = useMemo(() => {
    if (!selectedKey) return ''
    const date = formatRuDate(selectedKey)
    const isPeriod = !reportData.hasDailyMeta && metaPeriod
    const periodLabel = isPeriod
      ? ` (данные Meta за период ${formatRuDate(metaPeriod.from)}–${formatRuDate(metaPeriod.to)})`
      : ''

    let out = `📊 Отчет по маркетингу ${date}\n`
    if (isPeriod) out += `⚠️ Meta не содержит разбивки по дням — показаны итоги за весь период\n`
    out += `\n`

    if (reportData.items.length === 0 && reportData.bxDeals.length === 0) {
      out += `Нет данных за эту дату.`
      return out
    }

    // Meta кампании
    if (reportData.items.length > 0) {
      out += `━━━ META ADS${periodLabel} ━━━\n\n`
      for (const item of reportData.items) {
        out += `📍 ${item.name}\n`
        out += `Расход: ${item.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} $\n`
        out += `Клики: ${item.clicks}  CTR: ${item.ctr}%\n`
        out += `Лидов (Meta): ${item.metaLeads}  CPL: ${item.cpl} $\n`
        if (item.deals > 0) out += `Сделок в CRM за день: ${item.deals}\n`
        out += `\n`
      }

      const totCpl = reportData.totals.metaLeads > 0 && reportData.totals.spend > 0
        ? (reportData.totals.spend / reportData.totals.metaLeads).toFixed(2) : '—'
      if (reportData.items.length > 1) {
        out += `ИТОГО Meta:\n`
        out += `Расход: ${reportData.totals.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} $\n`
        out += `Лидов: ${reportData.totals.metaLeads}  CPL: ${totCpl} $\n\n`
      }
    }

    // Bitrix за день
    if (reportData.bxDeals.length > 0) {
      out += `━━━ CRM / BITRIX за ${date} ━━━\n\n`
      out += `Новых сделок: ${reportData.bxDeals.length}\n`
      out += `Оплат: ${reportData.totalBxPaid}\n`
      if (reportData.totalRevenue > 0) {
        out += `Выручка: ${reportData.totalRevenue.toLocaleString('ru-RU')} ₸\n`
      }
    } else {
      out += `━━━ CRM / BITRIX за ${date} ━━━\n\nСделок за этот день: 0\n`
    }

    return out.trim()
  }, [selectedKey, reportData, metaPeriod])

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
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Готовый утренний отчет по маркетингу
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Date Selector с аккуратными понятными датами */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Выберите день отчета:
              </label>
              <span className="text-[10px] text-zinc-400">
                Кампаний: <strong className="text-zinc-800 dark:text-zinc-200">{reportData.items.length} шт</strong>
              </span>
            </div>

            {availableDates.length > 0 ? (
              <select
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
                className="select-base text-xs py-1.5 font-medium"
              >
                {availableDates.map(d => (
                  <option key={d.dateKey} value={d.dateKey}>
                    {d.formatted} ({d.count} записей)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-zinc-400">Загрузите файлы со сделками, чтобы выбрать дату</p>
            )}
          </div>

          {/* Formatted Text Box */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Текст для отправки (Telegram / WhatsApp):
            </label>
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
