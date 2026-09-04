// components/Header.jsx
import { Moon, Sun, Trash2, LogOut, Clock, Settings, Share2, LogIn, ShieldCheck, Eye } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Header({
  darkMode,
  onToggleDark,
  onReset,
  session,
  onOpenHistory,
  onOpenSettings,
  onOpenShare,
  onLoginClick,
  isSharedView,
}) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const isGuest = session?.isGuest
  const username = !isGuest ? (session?.user?.email?.replace('@marketing.local', '') || '') : ''

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* Minimalist Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-xs shadow-sm">
            M
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Marketing Analytics
            </span>
            <span className="hidden sm:inline text-[10px] text-zinc-400 font-medium">
              Meta × Bitrix24
            </span>
          </div>

          {isSharedView && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-full font-medium ml-1">
              <Eye size={11} />
              <span>Общий отчёт</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onOpenShare && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs font-semibold transition-all shadow-xs mr-1"
              title="Поделиться отчётом с начальником или коллегами"
            >
              <Share2 size={13} />
              <span>Поделиться</span>
            </button>
          )}

          {session && !isGuest && (
            <>
              {username && (
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mr-1.5 border border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {username}
                </div>
              )}
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Настройки интеграций"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs transition-colors"
                title="История отчётов"
              >
                <Clock size={13} />
                <span className="hidden sm:inline">История</span>
              </button>
            </>
          )}

          {isGuest && (
            <div className="flex items-center gap-1">
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900/40 font-medium">
                <ShieldCheck size={12} />
                <span>Автономно</span>
              </span>
              {onLoginClick && (
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Войти под аккаунтом для облачной синхронизации"
                >
                  <LogIn size={12} />
                  <span className="hidden sm:inline">Войти</span>
                </button>
              )}
            </div>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs transition-colors"
              title="Очистить текущие данные"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          )}

          <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={darkMode ? 'Светлая тема' : 'Тёмная тема'}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          
          {session && !isGuest && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Выйти"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
