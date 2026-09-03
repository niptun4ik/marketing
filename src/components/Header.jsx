// components/Header.jsx
import { Moon, Sun, Trash2, LogOut, Clock, Settings } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Header({ darkMode, onToggleDark, onReset, session, onOpenHistory, onOpenSettings }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const username = session?.user?.email?.replace('@marketing.local', '') || ''

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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {session && (
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
          
          {session && (
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
