// components/ErrorBoundary.jsx
// Глобальный перехватчик любых ошибок в React. Полностью исключает появление пустого белого экрана.
import { Component } from 'react'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Поймана критическая ошибка:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-red-200 dark:border-red-900/40 shadow-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Произошла ошибка при отображении
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Приложение не смогло обработать данные из файла. Ниже показана точная техническая причина:
            </p>

            <div className="bg-red-50/50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4 text-left font-mono text-xs text-red-600 dark:text-red-400 overflow-x-auto max-h-48 mb-6 break-words">
              <strong>{this.state.error?.name || 'Error'}:</strong> {this.state.error?.message || 'Неизвестная ошибка'}
              {this.state.error?.stack && (
                <pre className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 whitespace-pre-wrap">
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary justify-center gap-2"
              >
                <Trash2 size={16} /> Очистить данные и перезагрузить
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary justify-center gap-2"
              >
                <RefreshCw size={16} /> Просто обновить страницу
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
