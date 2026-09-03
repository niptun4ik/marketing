import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { Mail, Lock, LogIn, UserPlus, AlertTriangle, Bug } from 'lucide-react'

// Диагностика: показываем первые символы URL (не весь ключ — из соображений безопасности)
const debugUrl = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.slice(0, 30)}…`
  : 'НЕ ЗАДАН'
const debugKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  ? `${import.meta.env.VITE_SUPABASE_ANON_KEY.slice(0, 12)}…`
  : 'НЕ ЗАДАН'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Регистрация успешна! Проверьте email для подтверждения.')
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Failed to fetch — браузер не смог достучаться до Supabase. Нажмите «Диагностика» ниже.')
      } else {
        setError(err.message || 'Произошла ошибка при авторизации')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isLogin ? 'Вход в систему' : 'Регистрация'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Войдите, чтобы сохранять и загружать историю отчётов
          </p>
        </div>

        {/* Предупреждение о незаданных переменных */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs flex gap-2 items-start">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong>Переменные Supabase не вшиты в сборку.</strong>
              <p className="mt-0.5">
                Убедитесь, что в Vercel добавлены <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_ANON_KEY</code>,
                затем нажмите <strong>Redeploy</strong>.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base pl-10"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : isLogin ? (
              <><LogIn size={16} /> Войти</>
            ) : (
              <><UserPlus size={16} /> Зарегистрироваться</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors block w-full"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>

          {/* Кнопка диагностики */}
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-500 flex items-center gap-1 mx-auto"
          >
            <Bug size={12} /> Диагностика
          </button>

          {showDebug && (
            <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-left text-xs font-mono space-y-1 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 font-sans font-semibold mb-2">
                Переменные в текущей сборке Vercel:
              </p>
              <p>
                <span className="text-gray-400">VITE_SUPABASE_URL:</span>{' '}
                <span className={debugUrl === 'НЕ ЗАДАН' ? 'text-red-500 font-bold' : 'text-green-500'}>
                  {debugUrl}
                </span>
              </p>
              <p>
                <span className="text-gray-400">VITE_SUPABASE_ANON_KEY:</span>{' '}
                <span className={debugKey === 'НЕ ЗАДАН' ? 'text-red-500 font-bold' : 'text-green-500'}>
                  {debugKey}
                </span>
              </p>
              <p className="mt-2 text-gray-400 font-sans text-[10px] leading-tight">
                Если оба значения заданы, но ошибка Failed to fetch — проверьте статус проекта в Supabase Dashboard (не на паузе ли).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
