// components/MappingModal.jsx
import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'

const META_FIELDS = [
  { key: 'campaign_name', label: 'Название кампании', required: true },
  { key: 'adset_name',    label: 'Группа объявлений', required: false },
  { key: 'ad_name',       label: 'Название объявления', required: false },
  { key: 'date',          label: 'Дата начала (Date Start)', required: false },
  { key: 'date_end',      label: 'Дата окончания (Date End)', required: false },
  { key: 'spend',         label: 'Затраты (Spend)', required: true },
  { key: 'impressions',   label: 'Показы (Impressions)', required: true },
  { key: 'clicks',        label: 'Клики (Clicks)', required: true },
  { key: 'leads',         label: 'Лиды / Результат (Meta)', required: false },
]

const BITRIX_FIELDS = [
  { key: 'deal_id',      label: 'ID сделки / лида', required: false },
  { key: 'created_date', label: 'Дата создания', required: false },
  { key: 'deal_name',    label: 'Название сделки', required: false },
  { key: 'formname',     label: 'Название формы (formname)', required: false },
  { key: 'utm_source',   label: 'utm_source / Источник', required: false },
  { key: 'utm_campaign', label: 'utm_campaign / Кампания', required: false },
  { key: 'stage',        label: 'Стадия сделки', required: true },
  { key: 'amount',       label: 'Сумма сделки', required: false },
]

export default function MappingModal({ isOpen, type, columns, initialMapping, onConfirm, onClose }) {
  const [mapping, setMapping] = useState({})
  const fields = type === 'meta' ? META_FIELDS : BITRIX_FIELDS

  useEffect(() => {
    setMapping(initialMapping || {})
  }, [initialMapping, isOpen])

  if (!isOpen) return null

  const title = type === 'meta' ? 'Маппинг колонок — Meta Ads' : 'Маппинг колонок — Bitrix24'
  const missingRequired = fields.filter((f) => f.required && !mapping[f.key]).map((f) => f.label)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              Выберите, какая колонка вашего файла соответствует каждому полю. Поля, помеченные{' '}
              <span className="text-red-500">*</span>, обязательны.
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {fields.map(({ key, label, required }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-48 text-sm text-gray-700 dark:text-gray-300 shrink-0">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <select
                value={mapping[key] || ''}
                onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                className="select-base flex-1"
              >
                <option value="">— не выбрано —</option>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Missing warning */}
        {missingRequired.length > 0 && (
          <div className="mx-5 mb-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs">
            Обязательные поля не выбраны: {missingRequired.join(', ')}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button
            onClick={() => onConfirm(mapping)}
            disabled={missingRequired.length > 0}
            className="btn-primary"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  )
}
