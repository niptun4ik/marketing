// components/FunnelEditor.jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Settings2, GripVertical, Plus, X, ChevronDown, ChevronUp, Check } from 'lucide-react'

export default function FunnelEditor({ bxDeals = [], session, stageOrder, onStageOrderChange }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localOrder, setLocalOrder] = useState(stageOrder || [])
  const [dragging, setDragging] = useState(null)

  // Все уникальные стадии из данных Bitrix
  const allStages = [...new Set((bxDeals || []).map(d => d?.stage).filter(Boolean))].sort()

  useEffect(() => {
    setLocalOrder(stageOrder || [])
  }, [stageOrder])

  const toggleStage = (stage) => {
    setLocalOrder(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    )
  }

  const moveStage = (from, to) => {
    setLocalOrder(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleSave = useCallback(async () => {
    onStageOrderChange(localOrder)
    if (!session?.user?.id) return
    setSaving(true)
    await supabase.from('funnel_config').upsert({
      user_id: session.user.id,
      stage_order: localOrder,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
    setOpen(false)
  }, [localOrder, session, onStageOrderChange])

  // Drag handlers
  const onDragStart = (e, idx) => {
    setDragging(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e, idx) => {
    e.preventDefault()
    if (dragging !== null && dragging !== idx) moveStage(dragging, idx)
    setDragging(idx)
  }
  const onDragEnd = () => setDragging(null)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors"
      >
        <Settings2 size={13} />
        Настроить воронку
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 space-y-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            Выберите стадии из Bitrix24 и упорядочите их по воронке:
          </p>

          {allStages.length === 0 ? (
            <p className="text-xs text-gray-400">Загрузите данные из Bitrix — стадии появятся здесь автоматически</p>
          ) : (
            <div className="space-y-1">
              {/* Выбранные стадии (с drag-n-drop) */}
              {localOrder.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Порядок в воронке:</p>
                  {localOrder.map((stage, idx) => (
                    <div
                      key={stage}
                      draggable
                      onDragStart={e => onDragStart(e, idx)}
                      onDragOver={e => onDragOver(e, idx)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-brand-200 dark:border-brand-800 cursor-grab transition-all ${dragging === idx ? 'opacity-50 scale-95' : ''}`}
                    >
                      <GripVertical size={13} className="text-gray-300 shrink-0" />
                      <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-gray-700 dark:text-gray-200 flex-1">{stage}</span>
                      <button
                        onClick={() => toggleStage(stage)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Доступные стадии */}
              {allStages.filter(s => !localOrder.includes(s)).length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Добавить стадию:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allStages.filter(s => !localOrder.includes(s)).map(stage => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-brand-400 hover:text-brand-500 transition-all"
                      >
                        <Plus size={11} /> {stage}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              {saving ? (
                <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
              ) : (
                <Check size={12} />
              )}
              {saving ? 'Сохраняется...' : 'Применить'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-xs px-3 py-1.5">
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
