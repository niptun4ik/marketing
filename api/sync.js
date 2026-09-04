import { createClient } from '@supabase/supabase-js'

// ВАЖНО: Для работы API на сервере нам нужен SERVICE_ROLE_KEY, чтобы обходить RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Защита от несанкционированного вызова из интернета
  const authHeader = req.headers['authorization'] || req.headers['x-cron-secret']
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid cron secret' })
  }

  // Защита от запуска без ключей
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ 
      error: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable in Vercel" 
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const logs = []
  
  try {
    // 1. Получаем все интеграции всех пользователей
    const { data: integrations, error: intErr } = await supabase.from('integrations').select('*')
    if (intErr) throw intErr

    // Проходимся по каждому пользователю, у которого настроены ключи
    for (const config of integrations) {
      const userId = config.user_id
      logs.push(`Start syncing for user: ${userId}`)

      // --- 2. СИНХРОНИЗАЦИЯ META ADS ---
      if (config.meta_access_token && config.meta_ad_account_id) {
        try {
          // Запрашиваем данные за последние 7 дней с разбивкой по дням и объявлениям
          const url = `https://graph.facebook.com/v18.0/${config.meta_ad_account_id}/insights?level=ad&date_preset=last_7d&time_increment=1&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions&access_token=${config.meta_access_token}`
          
          const metaRes = await fetch(url)
          const metaData = await metaRes.json()
          
          if (metaData.error) throw new Error(metaData.error.message)

          if (metaData.data && metaData.data.length > 0) {
            const metaRows = metaData.data.map(row => {
              // Ищем события "Лид" в массиве actions
              let leads = 0
              if (row.actions) {
                const leadAction = row.actions.find(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
                if (leadAction) leads = parseInt(leadAction.value || 0, 10)
              }
              
              return {
                user_id: userId,
                date: row.date_start,
                campaign_id: row.campaign_id,
                campaign_name: row.campaign_name,
                adset_id: row.adset_id,
                adset_name: row.adset_name,
                ad_id: row.ad_id,
                ad_name: row.ad_name,
                spend: parseFloat(row.spend || 0),
                impressions: parseInt(row.impressions || 0, 10),
                clicks: parseInt(row.clicks || 0, 10),
                leads: leads
              }
            })

            // Сохраняем в Supabase (Upsert обновляет записи, если они уже есть)
            const { error: dbErr } = await supabase.from('meta_stats').upsert(metaRows, { onConflict: 'user_id, date, ad_id' })
            if (dbErr) throw dbErr
            
            logs.push(`Meta Ads: Synced ${metaRows.length} daily ad records`)
          }
        } catch (e) {
          logs.push(`Meta Ads Error: ${e.message}`)
        }
      }

      // --- 3. СИНХРОНИЗАЦИЯ BITRIX24 ---
      if (config.bitrix_webhook_url) {
        try {
          // Ищем сделки, которые были изменены за последние 7 дней
          const d = new Date()
          d.setDate(d.getDate() - 7)
          const since = d.toISOString()

          const url = `${config.bitrix_webhook_url.replace(/\/$/, '')}/crm.deal.list.json`
          
          let allDeals = []
          let start = 0
          
          // Пагинация (если сделок много)
          while (true) {
            const bxRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filter: { '>=DATE_MODIFY': since },
                select: ['ID', 'DATE_CREATE', 'STAGE_ID', 'OPPORTUNITY', 'UTM_SOURCE', 'UTM_CAMPAIGN', 'UTM_CONTENT'],
                start: start
              })
            })
            
            const bxData = await bxRes.json()
            if (bxData.error) throw new Error(bxData.error_description)
            
            if (bxData.result) allDeals.push(...bxData.result)
            
            if (bxData.next) {
              start = bxData.next
            } else {
              break
            }
          }

          if (allDeals.length > 0) {
            const bitrixRows = allDeals.map(deal => ({
              user_id: userId,
              deal_id: String(deal.ID),
              created_date: deal.DATE_CREATE,
              utm_source: deal.UTM_SOURCE || '',
              utm_campaign: deal.UTM_CAMPAIGN || '',
              utm_content: deal.UTM_CONTENT || '',
              stage: String(deal.STAGE_ID || ''),
              amount: parseFloat(deal.OPPORTUNITY || 0)
            }))

            // Сохраняем в базу (Upsert обновит статус сделки, если он поменялся)
            const { error: dbErr } = await supabase.from('bitrix_deals').upsert(bitrixRows, { onConflict: 'user_id, deal_id' })
            if (dbErr) throw dbErr

            logs.push(`Bitrix24: Synced ${bitrixRows.length} modified deals`)
          }
        } catch (e) {
          logs.push(`Bitrix24 Error: ${e.message}`)
        }
      }
    }

    return res.status(200).json({ success: true, logs })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ success: false, error: error.message, logs })
  }
}
