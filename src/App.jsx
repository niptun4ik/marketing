// App.jsx — Root component, manages state machine: upload → mapping → dashboard
import { useState, useEffect } from 'react'
import Header from './components/Header'
import FileUploader from './components/FileUploader'
import MappingModal from './components/MappingModal'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import HistoryModal from './components/HistoryModal'
import SettingsModal from './components/SettingsModal'
import ShareModal from './components/ShareModal'
import ErrorBoundary from './components/ErrorBoundary'
import { parseFile, applyMapping, autoDetectMapping } from './hooks/useFileParser'
import { useLocalStorage, clearLocalStorage } from './hooks/useLocalStorage'
import { supabase } from './supabaseClient'
import { decodeReportPayload } from './utils/shareUtils'
import {
  DEMO_META_ROWS, DEMO_BITRIX_ROWS,
  META_FIELD_ALIASES, BITRIX_FIELD_ALIASES,
} from './utils/demoData'

const LS_KEY = 'mkt-analytics-session'

function healBitrixRows(rows) {
  if (!Array.isArray(rows)) return rows
  return rows.map(row => {
    const healed = { ...row }
    for (const [k, v] of Object.entries(healed)) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
        const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/)
        if (m) {
          const [, y, mm, dd, rest] = m
          const yNum = parseInt(y, 10)
          const mNum = parseInt(mm, 10)
          const dNum = parseInt(dd, 10)
          let shouldSwap = false
          if (yNum === 2026 && mNum > 9 && dNum <= 12) shouldSwap = true
          else if (yNum === 2026 && mNum <= 3 && (dNum === 8 || dNum === 9)) shouldSwap = true
          else if (yNum === 2026 && mNum >= 5 && mNum <= 7 && dNum === 8) shouldSwap = true

          if (shouldSwap) {
            healed[k] = `${y}-${String(dNum).padStart(2, '0')}-${String(mNum).padStart(2, '0')}${rest}`
          }
        }
      }
    }
    return healed
  })
}

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

  // ─── Modals & View States ──────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [isSharedView, setIsSharedView] = useState(false)

  // ─── Autonomous Guest Mode ────────────────────────────────────────────────
  const [isGuest, setIsGuest] = useLocalStorage('mkt-guest-mode', false)

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
  const [isDemo, setIsDemo] = useState(localSession?.isDemo || false)
  const [metaRows, setMetaRows] = useState(() => {
    if (localSession?.isDemo) return DEMO_META_ROWS
    return localSession?.metaRows || null
  })
  const [bitrixRows, setBitrixRows] = useState(() => {
    if (localSession?.isDemo) return DEMO_BITRIX_ROWS
    return healBitrixRows(localSession?.bitrixRows) || null
  })

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

  // ─── Decode shared link payload from URL (#share=... or ?share=...) ───────
  useEffect(() => {
    async function checkSharedLink() {
      let shareStr = ''
      if (window.location.hash) {
        const match = window.location.hash.match(/[#&]share=([^&]+)/)
        if (match) shareStr = match[1]
      }
      if (!shareStr && window.location.search) {
        const params = new URLSearchParams(window.location.search)
        shareStr = params.get('share') || ''
      }

      if (!shareStr) return

      try {
        const decoded = await decodeReportPayload(shareStr)
        if (decoded && (decoded.metaRows?.length || decoded.bitrixRows?.length)) {
          setMetaRows(decoded.metaRows || [])
          setBitrixRows(healBitrixRows(decoded.bitrixRows) || [])
          if (decoded.metaFile) setMetaFile(decoded.metaFile)
          if (decoded.bitrixFile) setBitrixFile(decoded.bitrixFile)
          setIsSharedView(true)
          setIsGuest(true)
        }
      } catch (err) {
        console.error('Ошибка при распаковке отчёта из ссылки:', err)
      }
    }

    checkSharedLink()

    window.addEventListener('hashchange', checkSharedLink)
    return () => window.removeEventListener('hashchange', checkSharedLink)
  }, [])

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
    setIsSharedView(false)
    if (window.location.hash && window.location.hash.includes('share=')) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
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

  const effectiveSession = session || (isGuest ? { isGuest: true, user: { id: 'guest', email: 'guest@marketing.local' } } : null)
  const showDashboard = metaRows && bitrixRows

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onReset={showDashboard ? handleReset : null}
        session={effectiveSession}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenShare={showDashboard ? () => setShowShare(true) : null}
        onLoginClick={isGuest ? () => setIsGuest(false) : null}
        isSharedView={isSharedView}
      />

      {!effectiveSession ? (
        <Auth onContinueAutonomous={() => setIsGuest(true)} />
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
              <Dashboard
                metaRows={metaRows}
                bitrixRows={bitrixRows}
                session={effectiveSession}
                onOpenShare={() => setShowShare(true)}
              />
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
            session={effectiveSession}
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            session={effectiveSession}
          />

          {/* Share Modal */}
          <ShareModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            metaRows={metaRows}
            bitrixRows={bitrixRows}
            metaFile={metaFile}
            bitrixFile={bitrixFile}
          />
        </>
      )}
    </div>
  )
}
