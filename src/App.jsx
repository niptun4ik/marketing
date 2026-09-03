// App.jsx — Root component, manages state machine: upload → mapping → dashboard
import { useState, useEffect } from 'react'
import Header from './components/Header'
import FileUploader from './components/FileUploader'
import MappingModal from './components/MappingModal'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import HistoryModal from './components/HistoryModal'
import SettingsModal from './components/SettingsModal'
import ErrorBoundary from './components/ErrorBoundary'
import { parseFile, applyMapping, autoDetectMapping } from './hooks/useFileParser'
import { useLocalStorage, clearLocalStorage } from './hooks/useLocalStorage'
import { supabase } from './supabaseClient'
import {
  DEMO_META_ROWS, DEMO_BITRIX_ROWS,
  META_FIELD_ALIASES, BITRIX_FIELD_ALIASES,
} from './utils/demoData'

const LS_KEY = 'mkt-analytics-session'

export default function App() {
  // ─── Auth Session ────────────────────────────────────────────────────────
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ─── Dark mode ────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useLocalStorage('mkt-dark', false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // ─── Session persistence (Local) ──────────────────────────────────────────
  const [localSession, setLocalSession] = useLocalStorage(LS_KEY, null)

  // ─── Modals ────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // ─── Raw parsed rows ──────────────────────────────────────────────────────
  const [metaRaw, setMetaRaw]       = useState(null)   
  const [bitrixRaw, setBitrixRaw]   = useState(null)
  const [metaFile, setMetaFile]     = useState(null)   
  const [bitrixFile, setBitrixFile] = useState(null)

  // ─── Loading / error ──────────────────────────────────────────────────────
  const [metaLoading,   setMetaLoading]   = useState(false)
  const [bitrixLoading, setBitrixLoading] = useState(false)
  const [metaError,     setMetaError]     = useState(null)
  const [bitrixError,   setBitrixError]   = useState(null)

  // ─── Mapping modal ────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null) 

  // ─── Mapped rows (ready for dashboard) ───────────────────────────────────
  const [metaRows,   setMetaRows]   = useState(localSession?.metaRows   || null)
  const [bitrixRows, setBitrixRows] = useState(localSession?.bitrixRows || null)
  const [isDemo, setIsDemo] = useState(localSession?.isDemo || false)

  // ─── Restore file labels from local session ────────────────────────────────────
  useEffect(() => {
    if (localSession?.metaFile)   setMetaFile(localSession.metaFile)
    if (localSession?.bitrixFile) setBitrixFile(localSession.bitrixFile)
  }, [])

  // ─── Persist local session on change ────────────────────────────────────────────
  useEffect(() => {
    if (metaRows || bitrixRows) {
      setLocalSession({ metaRows, bitrixRows, metaFile, bitrixFile, isDemo })
    }
  }, [metaRows, bitrixRows, metaFile, bitrixFile, isDemo])

  // ─── File handlers ────────────────────────────────────────────────────────
  async function handleMetaFile(file) {
    setMetaLoading(true)
    setMetaError(null)
    setIsDemo(false)
    try {
      const parsed = await parseFile(file)
      const autoMap = autoDetectMapping(parsed.columns, META_FIELD_ALIASES)
      setMetaRaw(parsed)
      setMetaFile({ name: file.name, rowCount: parsed.rows.length, colCount: parsed.columns.length })
      setModal({ type: 'meta', columns: parsed.columns, mapping: autoMap })
    } catch (e) {
      setMetaError(e.message || 'Ошибка парсинга файла')
    } finally {
      setMetaLoading(false)
    }
  }

  async function handleBitrixFile(file) {
    setBitrixLoading(true)
    setBitrixError(null)
    setIsDemo(false)
    try {
      const parsed = await parseFile(file)
      const autoMap = autoDetectMapping(parsed.columns, BITRIX_FIELD_ALIASES)
      setBitrixRaw(parsed)
      setBitrixFile({ name: file.name, rowCount: parsed.rows.length, colCount: parsed.columns.length })
      setModal({ type: 'bitrix', columns: parsed.columns, mapping: autoMap })
    } catch (e) {
      setBitrixError(e.message || 'Ошибка парсинга файла')
    } finally {
      setBitrixLoading(false)
    }
  }

  // ─── Confirm mapping & Save to Supabase ──────────────────────────────────────────────────────
  async function handleMappingConfirm(mapping) {
    let newMeta = metaRows
    let newBitrix = bitrixRows

    if (modal.type === 'meta') {
      newMeta = applyMapping(metaRaw.rows, mapping)
      setMetaRows(newMeta)
    } else {
      newBitrix = applyMapping(bitrixRaw.rows, mapping)
      setBitrixRows(newBitrix)
    }
    setModal(null)

    // Save to Supabase if we have both files mapped and it's not demo data
    if (newMeta && newBitrix && session?.user?.id) {
      const file_name = `${metaFile?.name || 'meta'} + ${bitrixFile?.name || 'bitrix'}`
      const upload_data = {
        metaRows: newMeta,
        bitrixRows: newBitrix,
        metaFile: metaFile || { name: 'meta' },
        bitrixFile: bitrixFile || { name: 'bitrix' }
      }
      
      const { error } = await supabase.from('user_uploads').insert([
        {
          user_id: session.user.id,
          file_name,
          upload_data
        }
      ])

      if (error) {
        console.error('Ошибка сохранения отчета в БД:', error)
      }
    }
  }

  // ─── History Loader ────────────────────────────────────────────────────────────
  function handleLoadHistory(uploadData) {
    setMetaRows(uploadData.metaRows)
    setBitrixRows(uploadData.bitrixRows)
    setMetaFile(uploadData.metaFile)
    setBitrixFile(uploadData.bitrixFile)
    setIsDemo(false)
  }

  // ─── Demo data ────────────────────────────────────────────────────────────
  function handleLoadDemo() {
    setIsDemo(true)
    setMetaRows(DEMO_META_ROWS)
    setBitrixRows(DEMO_BITRIX_ROWS)
    setMetaFile({ name: 'demo_meta_ads.xlsx', rowCount: DEMO_META_ROWS.length, colCount: 7 })
    setBitrixFile({ name: 'demo_bitrix24.xlsx', rowCount: DEMO_BITRIX_ROWS.length, colCount: 6 })
  }

  // ─── Reset ───────────────────────────────────────────────────────────────
  function handleReset() {
    setMetaRows(null); setBitrixRows(null)
    setMetaFile(null); setBitrixFile(null)
    setMetaRaw(null);  setBitrixRaw(null)
    setMetaError(null); setBitrixError(null)
    setIsDemo(false)
    clearLocalStorage(LS_KEY)
    setLocalSession(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  const showDashboard = metaRows && bitrixRows

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onReset={showDashboard ? handleReset : null}
        session={session}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {!session ? (
        <Auth />
      ) : (
        <>
          {!showDashboard ? (
            <FileUploader
              metaFile={metaFile}
              bitrixFile={bitrixFile}
              metaLoading={metaLoading}
              bitrixLoading={bitrixLoading}
              metaError={metaError}
              bitrixError={bitrixError}
              onMetaFile={handleMetaFile}
              onBitrixFile={handleBitrixFile}
              onClearMeta={() => { setMetaFile(null); setMetaRows(null) }}
              onClearBitrix={() => { setBitrixFile(null); setBitrixRows(null) }}
              onLoadDemo={handleLoadDemo}
            />
          ) : (
            <ErrorBoundary>
              <Dashboard metaRows={metaRows} bitrixRows={bitrixRows} />
            </ErrorBoundary>
          )}

          {/* Mapping Modal */}
          {modal && (
            <MappingModal
              isOpen={true}
              type={modal.type}
              columns={modal.columns}
              initialMapping={modal.mapping}
              onConfirm={handleMappingConfirm}
              onClose={() => setModal(null)}
            />
          )}

          {/* History Modal */}
          <HistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            onLoadHistory={handleLoadHistory}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            session={session}
          />
        </>
      )}
    </div>
  )
}
