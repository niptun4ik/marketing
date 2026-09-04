// components/ExportButton.jsx
import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { exportToXLSX, exportToCSV } from '../utils/exportData'

export default function ExportButton({ campaigns, usdRate = 500 }) {
  const [open, setOpen] = useState(false)

  if (!campaigns?.length) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-primary"
      >
        <Download size={14} />
        Экспорт
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[180px] animate-slide-up">
            <button
              onClick={() => { exportToXLSX(campaigns, 'marketing_analytics.xlsx', usdRate); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileSpreadsheet size={15} className="text-green-500" />
              Скачать XLSX
            </button>
            <button
              onClick={() => { exportToCSV(campaigns, 'marketing_analytics.csv', usdRate); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700"
            >
              <FileText size={15} className="text-blue-500" />
              Скачать CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}
