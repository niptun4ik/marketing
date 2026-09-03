// components/ErrorBoundary.jsx
// Ловит любые ошибки рендера и показывает понятный экран вместо белой страницы
import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Ошибка рендера:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-red-100 dark:border-red-900/40 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ошибка при обработке данных
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              Возможная причина: неожиданный формат колонок в файле. Проверьте маппинг колонок и попробуйте снова.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="btn-primary mx-auto"
            >
              <RefreshCw size={15} /> Сбросить и начать заново
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
