// components/Header.jsx
import { BarChart3, Moon, Sun, Trash2 } from 'lucide-react'

export default function Header({ darkMode, onToggleDark, onReset }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <BarChart3 size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">
              Marketing Analytics
            </p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">
              Meta Ads × Bitrix24
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Сбросить данные"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline text-xs">Сбросить</span>
            </button>
          )}
          <button
            onClick={onToggleDark}
            className="btn-ghost"
            title={darkMode ? 'Светлая тема' : 'Тёмная тема'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  )
}
