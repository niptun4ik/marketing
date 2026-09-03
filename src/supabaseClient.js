import { createClient } from '@supabase/supabase-js'

// Поддерживаем как старое название VITE_SUPABASE_ANON_KEY, так и новое VITE_SUPABASE_PUBLISHABLE_KEY
const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const envUrl = typeof rawUrl === 'string' ? rawUrl.trim() : undefined
const envKey = typeof rawKey === 'string' ? rawKey.trim() : undefined

// Определяем, правильно ли сконфигурирован Supabase
const isValidKey = (key) =>
  typeof key === 'string' &&
  key.length > 20 &&
  (key.startsWith('eyJ') || key.startsWith('sb_'))

const isValidUrl = (url) =>
  typeof url === 'string' &&
  url.startsWith('https://') &&
  url.includes('.supabase.co')

export const isSupabaseConfigured = isValidUrl(envUrl) && isValidKey(envKey)

// Выводим диагностику в консоль браузера (F12) для отладки
if (import.meta.env.DEV || !isSupabaseConfigured) {
  console.group('[Supabase Debug]')
  console.log('URL valid:', isValidUrl(envUrl), '|', envUrl ? `${envUrl.slice(0, 40)}…` : 'НЕ ЗАДАН')
  console.log('KEY valid:', isValidKey(envKey), '|', envKey ? `${envKey.slice(0, 20)}…` : 'НЕ ЗАДАН')
  console.groupEnd()
}

const supabaseUrl = envUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = envKey || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
