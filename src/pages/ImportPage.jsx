import { useState, useRef } from 'react'
import { parseCsvFile, importCsv } from '../api/services/importService'
import './ImportPage.css'

const MAX_FILE_SIZE_MB = 10
const PREVIEW_ROWS = 5

// Colonnes minimales requises par module
const REQUIRED_COLUMNS = {
  products:  ['Name *', 'Price tax excluded', 'Active (0/1)'],
  customers: ['Last Name *', 'First Name *', 'Email *', 'Password *'],
  orders:    ['Total paid *', 'Payment *', 'Customer ID *'],
}

const MODULES = [
  {
    key: 'products',
    label: 'Produits',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
  },
  {
    key: 'customers',
    label: 'Clients',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'orders',
    label: 'Commandes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
]

// Étapes de l'import
const STEPS = ['Module', 'Fichier', 'Aperçu', 'Import']

const ImportPage = () => {
  const [step, setStep] = useState(0)
  const [selectedModule, setSelectedModule] = useState(null)
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [rows, setRows] = useState([])
  const [columns, setColumns] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState(null)
  const fileInputRef = useRef(null)

  // --- Étape 1 : choix du module ---
  const handleSelectModule = (mod) => {
    setSelectedModule(mod)
    setStep(1)
  }

  // --- Étape 2 : validation et parsing du fichier ---
  const handleFileChange = async (e) => {
    const selected = e.target.files[0]
    setFileError(null)

    if (!selected) return

    // Validation extension
    if (!selected.name.endsWith('.csv')) {
      setFileError('Le fichier doit être au format .csv')
      return
    }

    // Validation taille
    const sizeMb = selected.size / (1024 * 1024)
    if (sizeMb > MAX_FILE_SIZE_MB) {
      setFileError(`Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    try {
      const parsed = await parseCsvFile(selected)

      if (parsed.length === 0) {
        setFileError('Le fichier CSV est vide')
        return
      }

      // Validation des colonnes requises
      const cols = Object.keys(parsed[0])
      const required = REQUIRED_COLUMNS[selectedModule.key]
      const missing = required.filter((col) => !cols.includes(col))

      if (missing.length > 0) {
        setFileError(`Colonnes manquantes : ${missing.join(', ')}`)
        return
      }

      setFile(selected)
      setRows(parsed)
      setColumns(cols)
      setStep(2)
    } catch (err) {
      setFileError(`Erreur de lecture : ${err.message}`)
    }
  }

  // --- Étape 3 : lancer l'import ---
  const handleImport = async () => {
    setImporting(true)
    setProgress(0)
    setReport(null)
    setStep(3)

    try {
      const finalReport = await importCsv(
        rows,
        selectedModule.key,
        (pct) => setProgress(pct)
      )
      setReport(finalReport)
    } catch (err) {
      setReport({ success: 0, errors: [{ line: '?', message: err.message }] })
    } finally {
      setImporting(false)
    }
  }

  // --- Reset complet ---
  const handleReset = () => {
    setStep(0)
    setSelectedModule(null)
    setFile(null)
    setFileError(null)
    setRows([])
    setColumns([])
    setImporting(false)
    setProgress(0)
    setReport(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="import-page">

      {/* Header */}
      <div className="import-header">
        <div className="import-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <h1>Import CSV</h1>
          <p>Importez vos données vers PrestaShop via fichier CSV</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, idx) => (
          <div key={label} className={`step ${idx === step ? 'active' : ''} ${idx < step ? 'done' : ''}`}>
            <div className="step-circle">
              {idx < step
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : idx + 1
              }
            </div>
            <span className="step-label">{label}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {/* Contenu par étape */}
      <div className="import-body">

        {/* Étape 0 : choix du module */}
        {step === 0 && (
          <div>
            <p className="step-title">Quel type de données voulez-vous importer ?</p>
            <div className="module-cards">
              {MODULES.map((mod) => (
                <button key={mod.key} className="module-card" onClick={() => handleSelectModule(mod)}>
                  <div className="module-card-icon">{mod.icon}</div>
                  <span>{mod.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 1 : upload fichier */}
        {step === 1 && (
          <div>
            <p className="step-title">
              Importez votre fichier CSV pour
              <strong> {selectedModule?.label}</strong>
            </p>
            <div
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p>Cliquez pour choisir un fichier CSV</p>
              <span>Taille maximale : {MAX_FILE_SIZE_MB}MB — séparateur ;</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            {fileError && <div className="file-error">{fileError}</div>}
            <button className="btn-back" onClick={() => setStep(0)}>← Retour</button>
          </div>
        )}

        {/* Étape 2 : prévisualisation */}
        {step === 2 && (
          <div>
            <div className="preview-info">
              <div className="preview-meta">
                <span className="badge-blue">📄 {file?.name}</span>
                <span className="badge-gray">{rows.length} lignes détectées</span>
                <span className="badge-gray">{columns.length} colonnes</span>
              </div>
              <p className="step-title">Aperçu des {Math.min(PREVIEW_ROWS, rows.length)} premières lignes</p>
            </div>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {columns.slice(0, 6).map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                    {columns.length > 6 && <th>+{columns.length - 6} colonnes</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i}>
                      {columns.slice(0, 6).map((col) => (
                        <td key={col}>
                          {String(row[col] || '—').slice(0, 40)}
                          {String(row[col] || '').length > 40 ? '...' : ''}
                        </td>
                      ))}
                      {columns.length > 6 && <td className="more-cols">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="preview-actions">
              <button className="btn-back" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn-import" onClick={handleImport}>
                Lancer l'import ({rows.length} lignes)
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : import en cours + rapport */}
        {step === 3 && (
          <div className="import-progress-section">
            {importing ? (
              <>
                <p className="step-title">Import en cours...</p>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-label">{progress}% — Ne fermez pas cette page</p>
              </>
            ) : report && (
              <div className="report">
                <div className={`report-summary ${report.errors.length === 0 ? 'all-success' : 'has-errors'}`}>
                  <div className="report-stat">
                    <span className="report-number success">{report.success}</span>
                    <span>Importés avec succès</span>
                  </div>
                  <div className="report-stat">
                    <span className="report-number error">{report.errors.length}</span>
                    <span>Erreurs</span>
                  </div>
                </div>

                {report.errors.length > 0 && (
                  <div className="error-list">
                    <p className="error-list-title">Détail des erreurs :</p>
                    {report.errors.map((err, i) => (
                      <div key={i} className="error-item">
                        <span className="error-line">Ligne {err.line}</span>
                        <span className="error-msg">{String(err.message).slice(0, 120)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-import" onClick={handleReset}>
                  Faire un nouvel import
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportPage