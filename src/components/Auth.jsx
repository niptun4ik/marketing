import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { User, Lock, LogIn, UserPlus, AlertTriangle, Bug } from 'lucide-react'

const debugUrl = import.meta.env.VITE_SUPABASE_URL
const debugKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Карта транслитерации для кириллических логинов
const RU_TO_LAT = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
  ә:'a', ғ:'g', қ:'q', ң:'n', ө:'o', ұ:'u', ү:'u', һ:'h', і:'i',
}

// Превращаем логин в уникальный валидный email, понятный Supabase
const toFakeEmail = (login) => {
  const clean = String(login || '').toLowerCase().trim()
  const translit = clean.split('').map(char => RU_TO_LAT[char] || char).join('')
  const safe = translit.replace(/[^a-z0-9_.-]/g, '_').replace(/_+/g, '_')
  return `${safe || 'user'}@marketing.local`
}

export default function Auth() {
  const [loading, setLoading]   = useState(false)
  const [isLogin, setIsLogin]   = useState(true)
  const [login, setLogin]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!login.trim()) { setError('Введите логин'); return }
    if (password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return }

    setLoading(true)
    setError(null)

    const email = toFakeEmail(login)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('Invalid login')) throw new Error('Неверный логин или пароль')
          throw error
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          if (error.message.includes('already registered')) throw new Error('Этот логин уже занят. Попробуйте другой.')
          throw error
        }
        // После регистрации сразу логинимся (подтверждение почты отключено)
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
        if (loginErr) throw loginErr
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Нет связи с Supabase. Нажмите «Диагностика» ниже.')
      } else {
        setError(err.message || 'Произошла ошибка')
      }
    } finally {
      setLoading(false)
    }
  }

  const urlDisplay = debugUrl ? `${debugUrl.slice(0, 35)}…` : '❌ НЕ ЗАДАН'
  const keyDisplay = debugKey ? `${debugKey.trim().slice(0, 18)}… (${debugKey.trim().length} симв.)` : '❌ НЕ ЗАДАН'
  const urlOk = debugUrl?.trim().startsWith('https://') && debugUrl?.includes('.supabase.co')
  const keyOk = debugKey?.trim().length > 20 && (debugKey.trim().startsWith('eyJ') || debugKey.trim().startsWith('sb_'))

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isLogin ? 'Вход' : 'Создать аккаунт'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {isLogin ? 'Введите логин и пароль' : 'Придумайте логин и пароль'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs flex gap-2 items-start">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong>Supabase не сконфигурирован.</strong>
              <p className="mt-1">Проверьте переменные в Vercel и сделайте Redeploy.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Логин
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="input-base pl-10"
                placeholder="например: ivanov"
                autoComplete="username"
                required
              />
            </div>
            {!isLogin && (
              <p className="text-[10px] text-gray-400 mt-1">Только латинские буквы, цифры, _ и -</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pl-10"
                placeholder="не менее 6 символов"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
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
              <><UserPlus size={16} /> Создать аккаунт</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null) }}
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>

          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-500 flex items-center gap-1 mx-auto"
          >
            <Bug size={12} /> Диагностика
          </button>

          {showDebug && (
            <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-left text-xs font-mono space-y-1.5 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 font-sans font-semibold mb-2 text-[11px]">
                Переменные в этой сборке:
              </p>
              <p>
                <span className="text-gray-400">URL: </span>
                <span className={urlOk ? 'text-green-500' : 'text-red-500 font-bold'}>{urlDisplay}</span>
                {urlOk ? ' ✅' : ' ❌'}
              </p>
              <p>
                <span className="text-gray-400">KEY: </span>
                <span className={keyOk ? 'text-green-500' : 'text-red-500 font-bold'}>{keyDisplay}</span>
                {keyOk ? ' ✅' : ' ❌'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
