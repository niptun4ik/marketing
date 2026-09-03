import { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, EyeOff } from 'lucide-react'
import { toNum, isWonStage } from '../utils/matchData'
import { supabase } from '../supabaseClient'

const fmt = (n, { style, dec = 0, fallback = '—' } = {}) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return fallback
  if (style === 'currency') return n.toLocaleString('ru-RU', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (style === 'percent') return n.toFixed(dec) + '%'
  return n.toLocaleString('ru-RU', { maximumFractionDigits: dec })
}

const COLUMNS = [
  { key: 'name',        label: 'Кампания / Группа / Объявление', sortable: false, width: 'min-w-[180px] max-w-[260px]' },
  { key: 'impressions', label: 'Показы',     sortable: true },
  { key: 'cpm',         label: 'CPM',        sortable: true },
  { key: 'clicks',      label: 'Клики',      sortable: true },
  { key: 'ctr',         label: 'CTR',        sortable: true },
  { key: 'cpc',         label: 'CPC',        sortable: true },
  { key: 'spend',       label: 'Spend',      sortable: true },
  { key: 'metaLeads',   label: 'Рез. (Meta)', sortable: true },
  { key: 'metaCr',      label: 'CR (Meta)',   sortable: true },
  { key: 'metaCpl',     label: 'Цена рез.',   sortable: true },
  { key: 'bxLeads',     label: 'Лиды BX',    sortable: true },
  { key: 'bxCr',        label: 'CR (BX)',    sortable: true },
  { key: 'cpl',         label: 'CPL (BX)',   sortable: true },
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
    case 'metaCr':      return fmt(v, { style: 'percent', dec: 2 })
    case 'bxCr':        return fmt(v, { style: 'percent', dec: 2 })
    case 'winRate':     return fmt(v, { style: 'percent', dec: 1 })
    case 'roas':        return (
      <span className={v >= 100 ? 'text-green-500 font-semibold' : v < 0 ? 'text-red-500 font-semibold' : ''}>
        {fmt(v, { style: 'percent', dec: 1 })}
      </span>
    )
    case 'spend':   return fmt(v, { style: 'currency' })
    case 'revenue': return fmt(v, { style: 'currency' })
    case 'cpl':     return fmt(v, { style: 'currency' })
    case 'metaCpl': return fmt(v, { style: 'currency' })
    case 'cpc':     return fmt(v, { style: 'currency' })
    case 'cpo':     return fmt(v, { style: 'currency' })
    case 'cpm':     return fmt(v, { style: 'currency' })
    default:        return '—'
  }
}

function rowBg(status) {
  if (status === 'green') return 'bg-emerald-50/40 dark:bg-emerald-950/15'
  if (status === 'red')   return 'bg-rose-50/40 dark:bg-rose-950/15'
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
      metaCr: clicks > 0 ? (metaLeads / clicks) * 100 : NaN,
      bxCr: clicks > 0 ? (bxLeads / clicks) * 100 : NaN,
      metaCpl: metaLeads > 0 ? spend / metaLeads : NaN,
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
function CampaignRow({ campaign, onHide, plans, onPlanChange, isSaving }) {
  const [open, setOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const m = campaign.metrics
  const name = campaign.campaign_name
  const plan = plans[name] || {}

  const p = {
    budget:  parseFloat(plan.budget  || 0),
    leads:   parseFloat(plan.leads   || 0),
    cpl:     parseFloat(plan.cpl     || 0),
    revenue: parseFloat(plan.revenue || 0),
  }
  const hasPlan = p.budget || p.leads || p.cpl || p.revenue

  function Bar({ fact, plan, invert = false }) {
    if (!plan) return null
    const pct = Math.min((fact / plan) * 100, 100)
    const isGood = invert ? fact <= plan : fact >= plan
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${isGood ? 'bg-green-500' : pct >= 80 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-semibold shrink-0 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          {((fact / plan) * 100).toFixed(0)}%
        </span>
      </div>
    )
  }

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer group/row ${rowBg(m.rowStatus)}`}
      >
        <td className="table-td">
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
              : <ChevronRight size={14} className="text-gray-400 shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {name}
                </p>
                {hasPlan && (
                  <span className="text-[9px] bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    KPI
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setPlanOpen(o => !o) }}
                  className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-all text-gray-400 hover:text-brand-500"
                  title="Задать план для кампании"
                >
                  🎯
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onHide?.(name) }}
                  className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  title="Скрыть кампанию из статистики"
                >
                  <EyeOff size={14} />
                </button>
              </div>
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

      {/* Plan-Fact sub-row */}
      {planOpen && (
        <tr className="border-b border-brand-100 dark:border-brand-900/30 bg-brand-50/40 dark:bg-brand-900/10">
          <td colSpan={COLUMNS.length} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 self-center mr-1">
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400">🎯 План:</p>
                {isSaving && (
                  <span className="text-[10px] text-gray-400 animate-pulse">💾 сохраняется...</span>
                )}
              </div>
              {[
                { key: 'budget',  label: 'Бюджет ($)',     fact: m.spend,    invert: true },
                { key: 'leads',   label: 'Лиды (Meta)',    fact: m.metaLeads },
                { key: 'cpl',     label: 'Цел. CPL ($)',   fact: m.metaCpl,  invert: true },
                { key: 'revenue', label: 'Выручка ($)',    fact: m.revenue },
              ].map(({ key, label, fact, invert }) => (
                <div key={key} className="flex flex-col gap-1 min-w-[110px]">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="не задан"
                    value={plan[key] || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onPlanChange(name, { ...plan, [key]: e.target.value })}
                    className="input-base text-xs py-1.5 w-full"
                  />
                  {plan[key] && <Bar fact={fact} plan={parseFloat(plan[key])} invert={invert} />}
                </div>
              ))}
              <button
                onClick={e => { e.stopPropagation(); onPlanChange(name, {}); setPlanOpen(false) }}
                className="text-[10px] text-red-400 hover:text-red-600 transition-colors self-end pb-1"
              >
                Сбросить план
              </button>
            </div>
          </td>
        </tr>
      )}

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

export default function AnalyticsTable({ campaigns, totals, onHideCampaign, session }) {
  const [sort, setSort] = useState({ key: 'spend', dir: 'desc' })

  // Plans — stored in Supabase so all users see the same data
  const [plans, setPlans] = useState({})
  const [savingPlan, setSavingPlan] = useState(null) // campaign name currently saving

  // Load all plans for this user on mount
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('campaign_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        for (const row of data) {
          map[row.campaign_name] = {
            budget:  row.budget  ?? '',
            leads:   row.leads   ?? '',
            cpl:     row.cpl     ?? '',
            revenue: row.revenue ?? '',
          }
        }
        setPlans(map)
      })
  }, [session])

  // Debounced save to Supabase
  const handlePlanChange = useCallback(async (campaignName, planData) => {
    // Update local state immediately (fast feedback)
    setPlans(prev => ({ ...prev, [campaignName]: planData }))

    if (!session?.user?.id) return

    // Clear = delete the row; otherwise upsert
    const isEmpty = !planData.budget && !planData.leads && !planData.cpl && !planData.revenue
    setSavingPlan(campaignName)

    if (isEmpty) {
      await supabase
        .from('campaign_plans')
        .delete()
        .eq('user_id', session.user.id)
        .eq('campaign_name', campaignName)
    } else {
      await supabase
        .from('campaign_plans')
        .upsert({
          user_id: session.user.id,
          campaign_name: campaignName,
          budget:  parseFloat(planData.budget)  || null,
          leads:   parseFloat(planData.leads)   || null,
          cpl:     parseFloat(planData.cpl)     || null,
          revenue: parseFloat(planData.revenue) || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, campaign_name' })
    }
    setSavingPlan(null)
  }, [session])

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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800">
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
              sorted.map((camp, i) => (
                <CampaignRow
                  key={i}
                  campaign={camp}
                  onHide={onHideCampaign}
                  plans={plans}
                  onPlanChange={handlePlanChange}
                  isSaving={savingPlan === camp.campaign_name}
                />
              ))
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
