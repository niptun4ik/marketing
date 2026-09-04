// components/InsightsStrip.jsx — Умная лента инсайтов и аномалий в стиле Linear/Vercel
import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle2, Info, ChevronRight } from 'lucide-react'

export default function InsightsStrip({ campaigns = [], totals, usdRate = 500 }) {
  const insights = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return []

    const items = []
    const validCamps = campaigns.filter(c => !c.unmatched && (c?.totals?.spend > 0 || c?.totals?.leads > 0))

    // 1. Лучшая кампания по продажам / окупаемости
    const profitable = [...validCamps]
      .filter(c => c?.metrics?.wonDeals > 0)
      .sort((a, b) => b.metrics.roas - a.metrics.roas)

    if (profitable.length > 0) {
      const top = profitable[0]
      const isPositive = top.metrics.roas > 0
      items.push({
        type: isPositive ? 'success' : 'info',
        icon: TrendingUp,
        tag: isPositive ? 'Лидер окупаемости' : 'Наибольшая выручка',
        title: top.campaign_name,
        desc: `Выручка ${Number(top.metrics.revenue).toLocaleString('ru-RU')} ₸ при расходе $${Number(top.metrics.spend).toFixed(2)} (ROAS: ${top.metrics.roas.toFixed(1)}%)`,
      })
    }

    // 2. Лучший CPL среди кампаний с лидами
    const withLeads = [...validCamps]
      .filter(c => c?.metrics?.metaLeads > 0 && c?.metrics?.spend > 0)
      .sort((a, b) => a.metrics.metaCpl - b.metrics.metaCpl)

    if (withLeads.length > 0 && withLeads[0].campaign_name !== profitable[0]?.campaign_name) {
      const bestCpl = withLeads[0]
      items.push({
        type: 'info',
        icon: CheckCircle2,
        tag: 'Минимальный CPL',
        title: bestCpl.campaign_name,
        desc: `Стоимость лида всего $${Number(bestCpl.metrics.metaCpl).toFixed(2)} (${bestCpl.metrics.metaLeads} заявок)`,
      })
    }

    // 3. Аномалия: расход идет, продаж 0
    const zeroSales = [...validCamps]
      .filter(c => c?.metrics?.spend >= 50 && c?.metrics?.wonDeals === 0)
      .sort((a, b) => b.metrics.spend - a.metrics.spend)

    if (zeroSales.length > 0) {
      const worst = zeroSales[0]
      items.push({
        type: 'danger',
        icon: AlertTriangle,
        tag: 'Расход без оплат',
        title: worst.campaign_name,
        desc: `Израсходовано $${Number(worst.metrics.spend).toFixed(2)}, получено ${worst.metrics.metaLeads} заявок, но 0 оплат в CRM`,
      })
    }

    // 4. WhatsApp / Неразмеченные сделки
    const unmatchedCamp = campaigns.find(c => c.unmatched || c.campaign_name.includes('WhatsApp'))
    if (unmatchedCamp && unmatchedCamp.bxDeals?.length > 0) {
      items.push({
        type: 'warning',
        icon: Info,
        tag: 'Канал WhatsApp',
        title: `${unmatchedCamp.bxDeals.length} сделок без UTM`,
        desc: 'Сделки из WhatsApp идут напрямую без UTM-меток кампаний. Смотрите детальный анализ во вкладке «CRM / Bitrix»',
      })
    }

    return items
  }, [campaigns, totals, usdRate])

  if (insights.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {insights.map((item, idx) => {
        const Icon = item.icon
        const colorStyles = {
          success: {
            border: 'border-emerald-200/70 dark:border-emerald-900/40',
            bg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
            tag: 'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
            dot: 'bg-emerald-500',
          },
          danger: {
            border: 'border-rose-200/70 dark:border-rose-900/40',
            bg: 'bg-rose-50/30 dark:bg-rose-950/10',
            tag: 'bg-rose-100/70 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
            dot: 'bg-rose-500',
          },
          warning: {
            border: 'border-amber-200/70 dark:border-amber-900/40',
            bg: 'bg-amber-50/30 dark:bg-amber-950/10',
            tag: 'bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
            dot: 'bg-amber-500',
          },
          info: {
            border: 'border-blue-200/70 dark:border-blue-900/40',
            bg: 'bg-blue-50/30 dark:bg-blue-950/10',
            tag: 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
            dot: 'bg-blue-500',
          },
        }[item.type] || colorStyles.info

        return (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-xl border ${colorStyles.border} ${colorStyles.bg} bg-white dark:bg-zinc-900/90 transition-all hover:border-zinc-300 dark:hover:border-zinc-700`}
          >
            <div className="mt-0.5 shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <span className={`w-2 h-2 rounded-full ${colorStyles.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${colorStyles.tag}`}>
                  {item.tag}
                </span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.title}
                </p>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                {item.desc}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

