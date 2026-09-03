import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { X, Clock, Database, Loader2, Download } from 'lucide-react'

export default function HistoryModal({ isOpen, onClose, onLoadHistory }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  async function fetchHistory() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_uploads')
      .select('id, file_name, created_at, upload_data')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка при загрузке истории:', error)
    } else {
      setHistory(data || [])
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">История отчётов</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-gray-400">
              <Loader2 className="animate-spin" size={24} />
              <p className="text-sm">Загрузка истории...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-gray-400">
              <Database size={24} />
              <p className="text-sm">История пуста</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[250px]">
                    {item.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onLoadHistory(item.upload_data)
                    onClose()
                  }}
                  className="btn-secondary px-3 py-1.5"
                >
                  <Download size={14} /> Загрузить
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
