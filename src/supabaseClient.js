import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase URL или Anon Key не найдены в переменных окружения. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env или в настройках Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
