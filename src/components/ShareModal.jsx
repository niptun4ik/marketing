// components/ShareModal.jsx
import { useState, useEffect } from 'react'
import { X, Share2, Copy, Check, ExternalLink, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'
import { encodeReportPayload } from '../utils/shareUtils'

export default function ShareModal({ isOpen, onClose, metaRows, bitrixRows, metaFile, bitrixFile, filters }) {
  const [shareUrl, setShareUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [urlLength, setUrlLength] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setCopied(false)

    encodeReportPayload({ metaRows, bitrixRows, metaFile, bitrixFile, filters })
      .then(encoded => {
        const origin = window.location.origin + window.location.pathname
        const fullUrl = `${origin}#share=${encoded}`
        setShareUrl(fullUrl)
        setUrlLength(fullUrl.length)
      })
      .catch(err => {
        console.error('Ошибка генерации ссылки:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, metaRows, bitrixRows, metaFile, bitrixFile, filters])

  if (!isOpen) return null

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenPreview = () => {
    if (!shareUrl) return
    window.open(shareUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Поделиться отчётом по ссылке
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Ссылка для начальника или коллег
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Info banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 flex gap-2.5 items-start text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="font-semibold">Без логина и регистрации:</p>
              <p className="text-[11px] leading-relaxed text-emerald-700/90 dark:text-emerald-300/90">
                Тот, кто перейдёт по ссылке, сразу увидит интерактивный дашборд со всеми расчётами, графиками и суммами. Никаких аккаунтов или паролей не потребуется.
              </p>
            </div>
          </div>

          {/* URL Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Готовая ссылка:
            </label>

            {loading ? (
              <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center px-3 text-xs text-zinc-400">
                Упаковка и шифрование данных отчета...
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={e => e.target.select()}
                  className="input-base text-xs font-mono pr-24 py-2 w-full text-zinc-700 dark:text-zinc-300 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick summary of what is shared */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Кампаний Meta:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{metaRows?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Сделок Bitrix24:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{bitrixRows?.length || 0}</span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <span>Размер ссылки (GZIP):</span>
              <span className="font-mono">~{(urlLength / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleOpenPreview}
            disabled={loading || !shareUrl}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
            title="Открыть в новой вкладке и увидеть отчёт глазами начальника"
          >
            <ExternalLink size={13} />
            <span>Проверить в новой вкладке</span>
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">
              Закрыть
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !shareUrl}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Скопировано!' : 'Скопировать ссылку'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
