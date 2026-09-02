// App.jsx — Root component, manages state machine: upload → mapping → dashboard
import { useState, useEffect } from 'react'
import Header from './components/Header'
import FileUploader from './components/FileUploader'
import MappingModal from './components/MappingModal'
import Dashboard from './components/Dashboard'
import { parseFile, applyMapping, autoDetectMapping } from './hooks/useFileParser'
import { useLocalStorage, clearLocalStorage } from './hooks/useLocalStorage'
import {
  DEMO_META_ROWS, DEMO_BITRIX_ROWS,
  META_FIELD_ALIASES, BITRIX_FIELD_ALIASES,
} from './utils/demoData'

const LS_KEY = 'mkt-analytics-session'

export default function App() {
  // ─── Dark mode ────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useLocalStorage('mkt-dark', false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // ─── Session persistence ──────────────────────────────────────────────────
  const [session, setSession] = useLocalStorage(LS_KEY, null)

  // ─── Raw parsed rows ──────────────────────────────────────────────────────
  const [metaRaw, setMetaRaw]       = useState(null)   // { rows, columns }
  const [bitrixRaw, setBitrixRaw]   = useState(null)
  const [metaFile, setMetaFile]     = useState(null)   // { name, rowCount, colCount }
  const [bitrixFile, setBitrixFile] = useState(null)

  // ─── Loading / error ──────────────────────────────────────────────────────
  const [metaLoading,   setMetaLoading]   = useState(false)
  const [bitrixLoading, setBitrixLoading] = useState(false)
  const [metaError,     setMetaError]     = useState(null)
  const [bitrixError,   setBitrixError]   = useState(null)

  // ─── Mapping modal ────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null) // { type: 'meta'|'bitrix', columns, mapping }

  // ─── Mapped rows (ready for dashboard) ───────────────────────────────────
  const [metaRows,   setMetaRows]   = useState(session?.metaRows   || null)
  const [bitrixRows, setBitrixRows] = useState(session?.bitrixRows || null)

  // ─── Restore file labels from session ────────────────────────────────────
  useEffect(() => {
    if (session?.metaFile)   setMetaFile(session.metaFile)
    if (session?.bitrixFile) setBitrixFile(session.bitrixFile)
  }, [])

  // ─── Persist session on change ────────────────────────────────────────────
  useEffect(() => {
    if (metaRows || bitrixRows) {
      setSession({ metaRows, bitrixRows, metaFile, bitrixFile })
    }
  }, [metaRows, bitrixRows, metaFile, bitrixFile])

  // ─── File handlers ────────────────────────────────────────────────────────
  async function handleMetaFile(file) {
    setMetaLoading(true)
    setMetaError(null)
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

  // ─── Confirm mapping ──────────────────────────────────────────────────────
  function handleMappingConfirm(mapping) {
    if (modal.type === 'meta') {
      setMetaRows(applyMapping(metaRaw.rows, mapping))
    } else {
      setBitrixRows(applyMapping(bitrixRaw.rows, mapping))
    }
    setModal(null)
  }

  // ─── Demo data ────────────────────────────────────────────────────────────
  function handleLoadDemo() {
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
    clearLocalStorage(LS_KEY)
    setSession(null)
  }

  const showDashboard = metaRows && bitrixRows

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onReset={showDashboard ? handleReset : null}
      />

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
        <Dashboard metaRows={metaRows} bitrixRows={bitrixRows} />
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
    </div>
  )
}
