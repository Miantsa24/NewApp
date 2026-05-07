import { useState, useRef } from 'react'
import { parseCsvFile, importCsv } from '../api/services/importService'
import { MODULES_CONFIG, MODULE_KEYS } from '../api/utils/modulesConfig'
import './ImportPage.css'

const MAX_FILE_SIZE_MB = 10
const PREVIEW_ROWS = 5
const STEPS = ['Module', 'Configuration', 'Fichier', 'Aperçu', 'Import']

const MODULE_ICONS = {
  products:     'ti-box',
  customers:    'ti-users',
  orders:       'ti-clipboard-list',
  categories:   'ti-folder',
  combinations: 'ti-adjustments',
  stock:        'ti-package',
}

const ImportPage = () => {
  const [step, setStep] = useState(0)
  const [selectedModule, setSelectedModule] = useState(null)
  const [delimiter, setDelimiter] = useState(';')
  const [multiDelimiter, setMultiDelimiter] = useState(',')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [rows, setRows] = useState([])
  const [columns, setColumns] = useState([])
  const [missingRequired, setMissingRequired] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState(null)
  const fileInputRef = useRef(null)

  const config = selectedModule ? MODULES_CONFIG[selectedModule] : null

  // --- Étape 0 : choix du module ---
  const handleSelectModule = (key) => {
    setSelectedModule(key)
    setStep(1)
  }

  // --- Étape 2 : upload + validation ---
  const handleFileChange = async (e) => {
    const selected = e.target.files[0]
    setFileError(null)
    setMissingRequired([])
    if (!selected) return

    if (!selected.name.endsWith('.csv')) {
      setFileError('Le fichier doit être au format .csv')
      return
    }

    const sizeMb = selected.size / (1024 * 1024)
    if (sizeMb > MAX_FILE_SIZE_MB) {
      setFileError(`Le fichier dépasse ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    try {
      const parsed = await parseCsvFile(selected, delimiter)

      if (parsed.length === 0) {
        setFileError('Le fichier CSV est vide')
        return
      }

      const cols = Object.keys(parsed[0])

      // Vérification colonnes obligatoires
      const missing = config.requiredFields
        .filter((f) => !cols.includes(f.csv))
        .map((f) => f.csv)

      if (missing.length > 0) {
        setMissingRequired(missing)
        setFileError(`Colonnes obligatoires manquantes dans le fichier`)
        return
      }

      setFile(selected)
      setRows(parsed)
      setColumns(cols)
      setStep(3)
    } catch (err) {
      setFileError(`Erreur de lecture : ${err.message}`)
    }
  }

  // --- Étape 4 : import ---
  const handleImport = async () => {
    setImporting(true)
    setProgress(0)
    setReport(null)
    setStep(4)

    try {
      const finalReport = await importCsv(
        rows,
        selectedModule,
        (pct) => setProgress(pct)
      )
      setReport(finalReport)
    } catch (err) {
      setReport({ success: 0, errors: [{ line: '?', message: err.message }] })
    } finally {
      setImporting(false)
    }
  }

  // --- Reset ---
  const handleReset = () => {
    setStep(0)
    setSelectedModule(null)
    setDelimiter(';')
    setMultiDelimiter(',')
    setFile(null)
    setFileError(null)
    setRows([])
    setColumns([])
    setMissingRequired([])
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
          <i className="ti ti-upload" aria-hidden="true"></i>
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
                ? <i className="ti ti-check" style={{ fontSize: 13 }}></i>
                : idx + 1
              }
            </div>
            <span className="step-label">{label}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="import-body">

        {/* Étape 0 : choix module */}
        {step === 0 && (
          <div>
            <p className="step-title">Quel type de données voulez-vous importer ?</p>
            <div className="module-grid">
              {MODULE_KEYS.map((key) => (
                <button
                  key={key}
                  className="module-card"
                  onClick={() => handleSelectModule(key)}
                >
                  <div className="module-card-icon">
                    <i className={`ti ${MODULE_ICONS[key]}`} aria-hidden="true"></i>
                  </div>
                  <span className="module-card-label">{MODULES_CONFIG[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Étape 1 : configuration + champs */}
        {step === 1 && config && (
          <div>
            <p className="step-title">
              Configuration pour l'import
              <strong> {config.label}</strong>
            </p>

            {/* Séparateurs */}
            <div className="config-section">
              <p className="config-section-title">
                <i className="ti ti-settings" aria-hidden="true"></i>
                Séparateurs
              </p>
              <div className="config-row">
                <div className="config-field">
                  <label>Séparateur de champs</label>
                  <div className="separator-options">
                    {[';', ',', '|', '\t'].map((sep) => (
                      <button
                        key={sep}
                        className={`sep-btn ${delimiter === sep ? 'active' : ''}`}
                        onClick={() => setDelimiter(sep)}
                      >
                        {sep === '\t' ? 'TAB' : sep}
                      </button>
                    ))}
                    <input
                      className="sep-custom"
                      value={![';', ',', '|', '\t'].includes(delimiter) ? delimiter : ''}
                      onChange={(e) => e.target.value && setDelimiter(e.target.value)}
                      placeholder="Autre"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="config-field">
                  <label>Séparateur de valeurs multiples</label>
                  <div className="separator-options">
                    {[',', ';', '|'].map((sep) => (
                      <button
                        key={sep}
                        className={`sep-btn ${multiDelimiter === sep ? 'active' : ''}`}
                        onClick={() => setMultiDelimiter(sep)}
                      >
                        {sep}
                      </button>
                    ))}
                    <input
                      className="sep-custom"
                      value={![',', ';', '|'].includes(multiDelimiter) ? multiDelimiter : ''}
                      onChange={(e) => e.target.value && setMultiDelimiter(e.target.value)}
                      placeholder="Autre"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Champs requis */}
            <div className="config-section">
              <p className="config-section-title">
                <i className="ti ti-asterisk" style={{ color: '#ef4444' }} aria-hidden="true"></i>
                Champs obligatoires
              </p>
              <div className="fields-grid">
                {config.requiredFields.map((f) => (
                  <div key={f.csv} className="field-item required">
                    <div className="field-item-top">
                      <span className="field-csv">{f.csv}</span>
                      <span className="field-badge required-badge">Requis</span>
                    </div>
                    <span className="field-desc">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Champs optionnels */}
            <div className="config-section">
              <p className="config-section-title">
                <i className="ti ti-circle-dashed" aria-hidden="true"></i>
                Champs optionnels
              </p>
              <div className="fields-grid">
                {config.optionalFields.map((f) => (
                  <div key={f.csv} className="field-item optional">
                    <div className="field-item-top">
                      <span className="field-csv">{f.csv}</span>
                      <span className="field-badge optional-badge">Optionnel</span>
                    </div>
                    <span className="field-desc">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(0)}>← Retour</button>
              <button className="btn-primary" onClick={() => setStep(2)}>
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : upload fichier */}
        {step === 2 && config && (
          <div>
            <p className="step-title">
              Importez votre fichier CSV pour
              <strong> {config.label}</strong>
            </p>

            <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
              <i className="ti ti-upload" style={{ fontSize: 32, color: '#94a3b8' }} aria-hidden="true"></i>
              <p>Cliquez pour choisir un fichier CSV</p>
              <span>Taille maximale : {MAX_FILE_SIZE_MB}MB — séparateur « {delimiter === '\t' ? 'TAB' : delimiter} »</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Erreur fichier */}
            {fileError && (
              <div className="file-error">
                <i className="ti ti-alert-circle" aria-hidden="true"></i>
                <div>
                  <p>{fileError}</p>
                  {missingRequired.length > 0 && (
                    <ul className="missing-list">
                      {missingRequired.map((col) => (
                        <li key={col}><code>{col}</code></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(1)}>← Retour</button>
            </div>
          </div>
        )}

        {/* Étape 3 : prévisualisation */}
        {step === 3 && (
          <div>
            <div className="preview-meta">
              <span className="badge-blue">
                <i className="ti ti-file" aria-hidden="true"></i>
                {file?.name}
              </span>
              <span className="badge-gray">{rows.length} lignes</span>
              <span className="badge-gray">{columns.length} colonnes</span>
              <span className="badge-blue">{config?.label}</span>
            </div>

            <p className="step-title" style={{ margin: '1rem 0 0.75rem' }}>
              Aperçu des {Math.min(PREVIEW_ROWS, rows.length)} premières lignes
            </p>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {columns.slice(0, 6).map((col) => {
                      const isRequired = config?.requiredFields.some((f) => f.csv === col)
                      return (
                        <th key={col}>
                          {col}
                          {isRequired && <span className="th-required">*</span>}
                        </th>
                      )
                    })}
                    {columns.length > 6 && <th>+{columns.length - 6} cols</th>}
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

            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(2)}>← Retour</button>
              <button className="btn-primary" onClick={handleImport}>
                <i className="ti ti-upload" aria-hidden="true"></i>
                Lancer l'import ({rows.length} lignes)
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 : progression + rapport */}
        {step === 4 && (
          <div className="import-progress-section">
            {importing ? (
              <>
                <div className="importing-icon">
                  <i className="ti ti-loader-2" aria-hidden="true"></i>
                </div>
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
                    <i className="ti ti-circle-check" style={{ fontSize: 28, color: '#22c55e' }} aria-hidden="true"></i>
                    <div>
                      <span className="report-number success">{report.success}</span>
                      <span className="report-stat-label">Importés avec succès</span>
                    </div>
                  </div>
                  <div className="report-divider" />
                  <div className="report-stat">
                    <i className="ti ti-circle-x" style={{ fontSize: 28, color: '#ef4444' }} aria-hidden="true"></i>
                    <div>
                      <span className="report-number error">{report.errors.length}</span>
                      <span className="report-stat-label">Erreurs</span>
                    </div>
                  </div>
                </div>

                {report.errors.length > 0 && (
                  <div className="error-list">
                    <p className="error-list-title">
                      <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                      Détail des erreurs
                    </p>
                    {report.errors.map((err, i) => (
                      <div key={i} className="error-item">
                        <span className="error-line">Ligne {err.line}</span>
                        <span className="error-msg">{String(err.message).slice(0, 150)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-primary" onClick={handleReset}>
                  <i className="ti ti-plus" aria-hidden="true"></i>
                  Nouvel import
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