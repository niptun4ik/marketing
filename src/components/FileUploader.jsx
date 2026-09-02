// components/FileUploader.jsx
import { useRef, useState, useCallback } from 'react'
import { Upload, CheckCircle2, AlertCircle, X, FileSpreadsheet } from 'lucide-react'

function DropZone({ label, icon, description, file, onFile, onClear, error, loading }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
          transition-all duration-200 min-h-[180px] cursor-pointer select-none
          ${dragging ? 'drop-active scale-[1.01]' : ''}
          ${file
            ? 'border-green-400 bg-green-50 dark:bg-green-900/10 cursor-default'
            : error
            ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/10'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sr-only"
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Парсинг…</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center animate-fade-in">
            <CheckCircle2 size={28} className="text-green-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[220px]">
                {file.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{file.rowCount} строк · {file.colCount} колонок</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${error ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {error ? <AlertCircle size={20} className="text-red-400" /> : icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {error || 'Перетащите файл или нажмите'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              CSV / XLSX
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FileUploader({
  metaFile, bitrixFile,
  metaLoading, bitrixLoading,
  metaError, bitrixError,
  onMetaFile, onBitrixFile,
  onClearMeta, onClearBitrix,
  onLoadDemo,
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Сквозная аналитика кампаний
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          Загрузите выгрузки из Meta Ads и Bitrix24 для автоматического расчёта метрик
        </p>
      </div>

      {/* Drop zones */}
      <div className="flex flex-col sm:flex-row gap-4">
        <DropZone
          label="Выгрузка Meta Ads"
          description="Campaign, AdSet, Ad, Spend, Impressions, Clicks, Leads"
          icon={<Upload size={20} className="text-brand-400" />}
          file={metaFile}
          onFile={onMetaFile}
          onClear={onClearMeta}
          error={metaError}
          loading={metaLoading}
        />
        <DropZone
          label="Выгрузка Bitrix24"
          description="Deal ID, Date, utm_source, utm_campaign, Stage, Amount"
          icon={<FileSpreadsheet size={20} className="text-purple-400" />}
          file={bitrixFile}
          onFile={onBitrixFile}
          onClear={onClearBitrix}
          error={bitrixError}
          loading={bitrixLoading}
        />
      </div>

      {/* Demo button */}
      <div className="mt-6 flex justify-center">
        <button onClick={onLoadDemo} className="btn-secondary gap-2">
          <FileSpreadsheet size={15} />
          Загрузить демо-данные
        </button>
      </div>

      {/* Step hint */}
      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        {[
          { n: '1', label: 'Загрузите файлы' },
          { n: '2', label: 'Сопоставьте колонки' },
          { n: '3', label: 'Анализируйте данные' },
        ].map(({ n, label }) => (
          <div key={n} className="flex flex-col items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
              {n}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
