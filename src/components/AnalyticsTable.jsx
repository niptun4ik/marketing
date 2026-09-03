import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { toNum, isWonStage } from '../utils/matchData'

const fmt = (n, { style, dec = 0, fallback = '—' } = {}) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return fallback
  if (style === 'currency') return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
  if (style === 'percent') return n.toFixed(dec) + '%'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: dec })
}

const COLUMNS = [
  { key: 'name',        label: 'Кампания / Группа / Объявление', sortable: false, width: 'min-w-[180px] max-w-[260px]' },
  { key: 'impressions', label: 'Показы',     sortable: true },
  { key: 'clicks',      label: 'Клики',      sortable: true },
  { key: 'ctr',         label: 'CTR',        sortable: true },
  { key: 'cpc',         label: 'CPC',        sortable: true },
  { key: 'spend',       label: 'Spend',      sortable: true },
  { key: 'metaLeads',   label: 'Лиды Meta',  sortable: true },
  { key: 'bxLeads',     label: 'Лиды BX',    sortable: true },
  { key: 'cpl',         label: 'CPL',        sortable: true },
  { key: 'wonDeals',    label: 'Продажи',    sortable: true },
  { key: 'winRate',     label: 'Win Rate',   sortable: true },
  { key: 'revenue',     label: 'Выручка',    sortable: true },
  { key: 'cpo',         label: 'CPO',        sortable: true },
  { key: 'roas',        label: 'ROAS',       sortable: true },
]

function renderCell(col, metrics, isTotal = false) {
  const v = metrics[col.key]
  switch (col.key) {
    case 'impressions': return fmt(v, {})
    case 'clicks':      return fmt(v, {})
    case 'metaLeads':   return fmt(v, {})
    case 'bxLeads':     return fmt(v, {})
    case 'wonDeals':    return fmt(v, {})
    case 'ctr':         return fmt(v, { style: 'percent', dec: 2 })
    case 'winRate':     return fmt(v, { style: 'percent', dec: 1 })
    case 'roas':        return (
      <span className={v >= 100 ? 'text-green-500 font-semibold' : v < 0 ? 'text-red-500 font-semibold' : ''}>
        {fmt(v, { style: 'percent', dec: 1 })}
      </span>
    )
    case 'spend':   return fmt(v, { style: 'currency' })
    case 'revenue': return fmt(v, { style: 'currency' })
    case 'cpl':     return fmt(v, { style: 'currency' })
    case 'cpc':     return fmt(v, { style: 'currency' })
    case 'cpo':     return fmt(v, { style: 'currency' })
    default:        return '—'
  }
}

function rowBg(status) {
  if (status === 'green') return 'bg-green-50/60 dark:bg-green-900/10'
  if (status === 'red')   return 'bg-red-50/60 dark:bg-red-900/10'
  return ''
}

// Ad-level row
function AdRow({ ad, bxDeals = [] }) {
  const m = useMemo(() => {
    const spend       = toNum(ad?.spend)
    const impressions = toNum(ad?.impressions)
    const clicks      = toNum(ad?.clicks)
    const metaLeads   = toNum(ad?.leads)
    const bxLeads     = (bxDeals || []).length
    const wonDeals    = (bxDeals || []).filter((d) => isWonStage(d?.stage)).length
    const revenue     = (bxDeals || []).filter((d) => isWonStage(d?.stage))
                               .reduce((s, d) => s + toNum(d?.amount), 0)
    return {
      spend, impressions, clicks, metaLeads, bxLeads, wonDeals, revenue,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : NaN,
      cpc: clicks > 0 ? spend / clicks : NaN,
      cpl: bxLeads > 0 ? spend / bxLeads : NaN,
      winRate: bxLeads > 0 ? (wonDeals / bxLeads) * 100 : NaN,
      cpo: wonDeals > 0 ? spend / wonDeals : NaN,
      roas: spend > 0 ? ((revenue - spend) / spend) * 100 : NaN,
      rowStatus: spend > 0 && (wonDeals === 0 || revenue < spend) ? 'red' : revenue > spend ? 'green' : 'neutral',
    }
  }, [ad, bxDeals])

  return (
    <tr className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${rowBg(m.rowStatus)}`}>
      <td className="table-td pl-14">
        <span className="text-xs text-gray-500 dark:text-gray-400">↳ {ad.ad_name || '(без названия)'}</span>
      </td>
      {COLUMNS.slice(1).map((col) => (
        <td key={col.key} className="table-td text-right">{renderCell(col, m)}</td>
      ))}
    </tr>
  )
}

// AdSet-level row
function AdSetRow({ adset, bxDeals }) {
  const [open, setOpen] = useState(false)
  const m = adset.metrics

  return (
    <>
      <tr
        onClick={() => adset.ads.length > 0 && setOpen((o) => !o)}
        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer ${rowBg(m.rowStatus)}`}
      >
        <td className="table-td pl-8">
          <div className="flex items-center gap-1.5">
            {adset.ads.length > 0 ? (
              open ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />
            ) : <span className="w-3" />}
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
              {adset.adset_name || '(без группы)'}
            </span>
          </div>
        </td>
        {COLUMNS.slice(1).map((col) => (
          <td key={col.key} className="table-td text-right text-xs">{renderCell(col, m)}</td>
        ))}
      </tr>
      {open && adset.ads.map((ad, i) => (
        <AdRow key={i} ad={ad} bxDeals={bxDeals} />
      ))}
    </>
  )
}

// Campaign-level row
function CampaignRow({ campaign }) {
  const [open, setOpen] = useState(false)
  const m = campaign.metrics

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer ${rowBg(m.rowStatus)}`}
      >
        <td className="table-td">
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
              : <ChevronRight size={14} className="text-gray-400 shrink-0" />
            }
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {campaign.campaign_name}
              </p>
              {campaign.unmatched && (
                <span className="text-[10px] text-amber-500 font-medium">Только Bitrix24</span>
              )}
            </div>
          </div>
        </td>
        {COLUMNS.slice(1).map((col) => (
          <td key={col.key} className="table-td text-right font-medium">{renderCell(col, m)}</td>
        ))}
      </tr>
      {open && campaign.adsets.map((adset, i) => (
        <AdSetRow key={i} adset={adset} bxDeals={campaign.bxDeals} />
      ))}
    </>
  )
}

// Totals footer row
function TotalsRow({ totals }) {
  return (
    <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700">
      <td className="table-td font-bold text-gray-900 dark:text-gray-100">Итого</td>
      {COLUMNS.slice(1).map((col) => (
        <td key={col.key} className="table-td text-right font-bold text-gray-900 dark:text-gray-100">
          {renderCell(col, totals)}
        </td>
      ))}
    </tr>
  )
}

export default function AnalyticsTable({ campaigns, totals }) {
  const [sort, setSort] = useState({ key: 'spend', dir: 'desc' })

  const sorted = useMemo(() => {
    if (!sort.key) return campaigns
    return [...campaigns].sort((a, b) => {
      const av = a.metrics[sort.key] ?? -Infinity
      const bv = b.metrics[sort.key] ?? -Infinity
      return sort.dir === 'asc' ? av - bv : bv - av
    })
  }, [campaigns, sort])

  const handleSort = (key) => {
    setSort((prev) => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    )
  }

  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey) return <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600" />
    return sort.dir === 'asc'
      ? <ArrowUp size={11} className="text-brand-500" />
      : <ArrowDown size={11} className="text-brand-500" />
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`table-th ${col.key !== 'name' ? 'text-right' : ''} ${col.sortable ? 'cursor-pointer' : ''} ${col.width || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400 text-sm">
                  Нет данных по заданным фильтрам
                </td>
              </tr>
            ) : (
              sorted.map((camp, i) => <CampaignRow key={i} campaign={camp} />)
            )}
          </tbody>
          {totals && sorted.length > 0 && (
            <tfoot>
              <TotalsRow totals={totals} />
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
