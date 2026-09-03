import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, CheckCircle2, Webhook, Facebook } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function SettingsModal({ isOpen, onClose, session }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    meta_access_token: '',
    meta_ad_account_id: '',
    bitrix_webhook_url: '',
  })

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      loadSettings()
    }
  }, [isOpen, session])

  const loadSettings = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      if (data) {
        setFormData({
          meta_access_token: data.meta_access_token || '',
          meta_ad_account_id: data.meta_ad_account_id || '',
          bitrix_webhook_url: data.bitrix_webhook_url || '',
        })
      }
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      // Upsert logic
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('integrations')
          .update({
            meta_access_token: formData.meta_access_token,
            meta_ad_account_id: formData.meta_ad_account_id,
            bitrix_webhook_url: formData.bitrix_webhook_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('integrations')
          .insert({
            user_id: session.user.id,
            meta_access_token: formData.meta_access_token,
            meta_ad_account_id: formData.meta_ad_account_id,
            bitrix_webhook_url: formData.bitrix_webhook_url,
          })
        if (error) throw error
      }

      setMessage({ type: 'success', text: 'Настройки успешно сохранены!' })
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Ошибка при сохранении: ' + err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Интеграции (API)</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Укажите ключи доступа для автоматического скачивания данных из рекламного кабинета и CRM.
          </p>

          {/* Facebook */}
          <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium">
              <Facebook size={18} />
              Meta Ads
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ad Account ID
              </label>
              <input
                type="text"
                placeholder="act_123456789"
                value={formData.meta_ad_account_id}
                onChange={(e) => setFormData(f => ({ ...f, meta_ad_account_id: e.target.value }))}
                className="input-base"
              />
              <p className="text-[10px] text-gray-400">Включая префикс "act_"</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                System User Access Token
              </label>
              <input
                type="password"
                placeholder="EAAGm0PX4ZCpwBA..."
                value={formData.meta_access_token}
                onChange={(e) => setFormData(f => ({ ...f, meta_access_token: e.target.value }))}
                className="input-base"
              />
            </div>
          </div>

          {/* Bitrix */}
          <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium">
              <Webhook size={18} />
              Bitrix24
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Webhook URL (crm.deal.list)
              </label>
              <input
                type="text"
                placeholder="https://your-domain.bitrix24.ru/rest/1/secret_code/"
                value={formData.bitrix_webhook_url}
                onChange={(e) => setFormData(f => ({ ...f, bitrix_webhook_url: e.target.value }))}
                className="input-base"
              />
              <p className="text-[10px] text-gray-400">
                Создайте входящий вебхук в Битриксе с правами на чтение CRM.
              </p>
            </div>
          </div>

          {/* Messages */}
          {message.text && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Отмена
          </button>
          <button 
            onClick={handleSave} 
            className="btn-primary" 
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (
              <>
                <Save size={16} />
                Сохранить ключи
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
