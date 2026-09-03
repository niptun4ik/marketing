// components/DailyReportModal.jsx
import { useState, useMemo } from 'react'
import { X, Copy, Check, MessageSquare } from 'lucide-react'
import { toNum, isWonStage, norm } from '../utils/matchData'

export default function DailyReportModal({ isOpen, onClose, metaRows = [], bitrixRows = [], campaigns = [] }) {
  // По умолчанию вчерашняя дата
  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }, [])

  const [selectedDate, setSelectedDate] = useState(yesterdayStr)
  const [copied, setCopied] = useState(false)

  // Парсинг любой строки даты
  const parseDateStr = (raw) => {
    if (!raw) return null
    if (raw instanceof Date && !isNaN(raw.getTime())) return raw.toISOString().split('T')[0]
    const s = String(raw).trim()
    const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (isoMatch) {
      const [, y, m, d] = isoMatch
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    const ruMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
    if (ruMatch) {
      const [, d, m, y] = ruMatch
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    return s.slice(0, 10)
  }

  // Расчет статистики с разбивкой по каждой кампании за день
  const reportData = useMemo(() => {
    if (!selectedDate) return { items: [], total: null }

    // 1. Фильтруем сделки Bitrix за выбранный день
    const dayDeals = (bitrixRows || []).filter(d => parseDateStr(d?.created_date) === selectedDate)

    // 2. Фильтруем строки Meta за выбранный день
    const dayMeta = (metaRows || []).filter(r => parseDateStr(r?.date) === selectedDate)
    const hasDailyMeta = dayMeta.length > 0

    // Группируем кампании
    const campMap = new Map()

    // Инициализируем из списка существующих кампаний
    for (const c of campaigns || []) {
      const name = c.campaign_name
      campMap.set(norm(name), {
        name,
        spend: 0,
        clicks: 0,
        leads: 0,
        deals: 0,
        paidDeals: 0,
        revenue: 0,
      })
    }

    if (hasDailyMeta) {
      // Точные данные по дням из Meta
      for (const row of dayMeta) {
        const key = norm(row?.campaign_name || '(без кампании)')
        if (!campMap.has(key)) {
          campMap.set(key, { name: row?.campaign_name, spend: 0, clicks: 0, leads: 0, deals: 0, paidDeals: 0, revenue: 0 })
        }
        const item = campMap.get(key)
        item.spend  += toNum(row?.spend)
        item.clicks += toNum(row?.clicks)
        item.leads  += toNum(row?.leads)
      }
    } else {
      // Если у Meta нет дат, пропорционально распределяем бюджет по кампаниям, где были лиды/сделки в этот день
      for (const c of campaigns || []) {
        const key = norm(c.campaign_name)
        const item = campMap.get(key)
        const totalCampDeals = c.bxDeals?.length || 1
        const dayCampDeals = dayDeals.filter(d => norm(d?.utm_campaign) === key).length
        const share = dayCampDeals > 0 ? (dayCampDeals / totalCampDeals) : 0
        item.spend  = +(toNum(c.totals?.spend) * share).toFixed(2)
        item.clicks = Math.round(toNum(c.totals?.clicks) * share)
        item.leads  = Math.round(toNum(c.totals?.leads) * share)
      }
    }

    // Добавляем сделки Bitrix по кампаниям
    for (const deal of dayDeals) {
      const key = norm(deal?.utm_campaign || '(без кампании)')
      if (!campMap.has(key)) {
        campMap.set(key, { name: deal?.utm_campaign, spend: 0, clicks: 0, leads: 0, deals: 0, paidDeals: 0, revenue: 0 })
      }
      const item = campMap.get(key)
      item.deals++
      if (isWonStage(deal?.stage)) {
        item.paidDeals++
        item.revenue += toNum(deal?.amount)
      }
    }

    // Оставляем только кампании, где была активность в этот день
    const activeItems = Array.from(campMap.values())
      .filter(i => i.spend > 0 || i.clicks > 0 || i.leads > 0 || i.deals > 0 || i.paidDeals > 0)
      .map(item => {
        const crLead = item.clicks > 0 ? ((item.leads / item.clicks) * 100).toFixed(2) : '0,00'
        const cpl = item.leads > 0 ? (item.spend / item.leads).toFixed(2) : (item.deals > 0 ? (item.spend / item.deals).toFixed(2) : item.spend.toFixed(2))
        const crPaid = item.leads > 0 ? ((item.paidDeals / item.leads) * 100).toFixed(1) : (item.deals > 0 ? ((item.paidDeals / item.deals) * 100).toFixed(1) : '0')

        return {
          ...item,
          crLead,
          cpl,
          crPaid,
        }
      })

    // Итоговая сумма за день
    const total = activeItems.reduce((acc, i) => ({
      spend: acc.spend + i.spend,
      clicks: acc.clicks + i.clicks,
      leads: acc.leads + i.leads,
      paidDeals: acc.paidDeals + i.paidDeals,
      revenue: acc.revenue + i.revenue,
    }), { spend: 0, clicks: 0, leads: 0, paidDeals: 0, revenue: 0 })

    const totalCrLead = total.clicks > 0 ? ((total.leads / total.clicks) * 100).toFixed(2) : '0,00'
    const totalCpl = total.leads > 0 ? (total.spend / total.leads).toFixed(2) : '0,00'
    const totalCrPaid = total.leads > 0 ? ((total.paidDeals / total.leads) * 100).toFixed(1) : '0'

    return {
      items: activeItems,
      total: {
        ...total,
        crLead: totalCrLead,
        cpl: totalCpl,
        crPaid: totalCrPaid,
      }
    }
  }, [selectedDate, metaRows, bitrixRows, campaigns])

  // Генерация текста точно по вашему формату
  const reportText = useMemo(() => {
    if (!selectedDate) return ''
    const [y, m, d] = selectedDate.split('-')
    const formattedDate = `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`

    let out = `Отчет по маркетингу ${formattedDate}\n\n`

    if (reportData.items.length === 0) {
      out += `Нет активности за эту дату.`
      return out
    }

    reportData.items.forEach(item => {
      out += `📍 ${item.name}\n\n`
      out += `Бюджет: ${item.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} $\n`
      out += `Клики: ${item.clicks}\n`
      out += `Конверсия в заявку: ${item.crLead}%\n`
      out += `Заявок: ${item.leads}\n`
      out += `Цена заявки: ${item.cpl} $\n`
      out += `CR% в оплату билета: ${item.crPaid}%\n`
      out += `Оплат билетов: ${item.paidDeals}\n`
      out += `На сумму: ${item.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 0 })} $\n\n`
    })

    if (reportData.total && reportData.items.length > 1) {
      out += `➖➖➖➖➖➖➖➖\n`
      out += `📊 ИТОГО ЗА ДЕНЬ:\n\n`
      out += `Бюджет: ${reportData.total.spend.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} $\n`
      out += `Клики: ${reportData.total.clicks}\n`
      out += `Конверсия в заявку: ${reportData.total.crLead}%\n`
      out += `Заявок: ${reportData.total.leads}\n`
      out += `Цена заявки: ${reportData.total.cpl} $\n`
      out += `CR% в оплату билета: ${reportData.total.crPaid}%\n`
      out += `Оплат билетов: ${reportData.total.paidDeals}\n`
      out += `На сумму: ${reportData.total.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 0 })} $`
    }

    return out.trim()
  }, [selectedDate, reportData])

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Дата отчета:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-base text-xs py-1"
              />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Кампаний в отчете:</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{reportData.items.length} шт</span>
            </div>
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
          <span className="text-[11px] text-zinc-400">Нажмите кнопку, чтобы скопировать и сразу вставить в чат</span>
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
