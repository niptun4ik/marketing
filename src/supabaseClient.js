import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  envUrl && 
  envKey && 
  !envUrl.includes('placeholder')
)

const supabaseUrl = envUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = envKey || 'placeholder-key'

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase URL или Anon Key не найдены в переменных окружения. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env или в настройках Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
