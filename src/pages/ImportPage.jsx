// src/pages/ImportPage.jsx
// Seule la section étape 2 (config) est modifiée pour afficher les liens inter-modules

import { useState, useRef } from 'react'
import { parseCsvFile, importMultiModule, detectDelimiter } from '../api/services/importService'
import { detectModulesFromHeaders } from '../api/utils/detectModules'
import { MODULES_CONFIG, MODULE_KEYS } from '../api/utils/modulesConfig'
import './ImportPage.css'

const MAX_FILE_SIZE_MB = 10
const PREVIEW_ROWS = 5

const STEPS = ['Fichier', 'Détection', 'Configuration', 'Aperçu', 'Import']

const MODULE_ICONS = {
  products:      'ti-box',
  customers:     'ti-users',
  orders:        'ti-clipboard-list',
  categories:    'ti-folder',
  combinations:  'ti-adjustments',
  stock:         'ti-package',
  taxes:         'ti-receipt-tax',
  suppliers:     'ti-truck',
  manufacturers: 'ti-award',
  warehouses:    'ti-building-warehouse',
}

const CONFIDENCE_LABEL = {
  high:   { label: 'Confiance élevée',   color: '#22c55e' },
  medium: { label: 'Confiance moyenne',  color: '#f59e0b' },
  low:    { label: 'Confiance faible',   color: '#ef4444' },
  none:   { label: 'Non détecté',        color: '#94a3b8' },
}

// Liens entre modules dans un même fichier
const MODULE_LINKS = {
  products:     { dependsOn: ['taxes', 'categories'],  desc: 'Reçoit id_tax_rules_group et id_category_default' },
  combinations: { dependsOn: ['products'],             desc: 'Reçoit id_product via référence' },
  stock:        { dependsOn: ['products'],             desc: 'Met à jour le stock via id_product' },
  orders:       { dependsOn: ['customers'],            desc: 'Reçoit id_customer via email' },
}

const ImportPage = () => {
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [delimiter, setDelimiter] = useState(';')
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const fileInputRef = useRef(null)

  const [detectionResults, setDetectionResults] = useState([])
  const [selectedModules, setSelectedModules] = useState([])

  const [moduleProgress, setModuleProgress] = useState({})
  const [moduleDone, setModuleDone] = useState({})
  const [importing, setImporting] = useState(false)
  const [globalReport, setGlobalReport] = useState(null)

  const handleFileChange = async (e) => {
    const selected = e.target.files[0]
    setFileError(null)
    if (!selected) return

    if (!selected.name.endsWith('.csv')) {
      setFileError('Le fichier doit être au format .csv')
      return
    }
    if (selected.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      setFileError(`Le fichier dépasse ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    try {
      const { delimiter: detected } = await detectDelimiter(selected)
      setDelimiter(detected)
      const parsed = await parseCsvFile(selected, detected)
      if (parsed.length === 0) { setFileError('Le fichier CSV est vide'); return }

      const hdrs = Object.keys(parsed[0])
      setFile(selected)
      setRows(parsed)
      setHeaders(hdrs)

      const results = detectModulesFromHeaders(hdrs)
      setDetectionResults(results)
      setSelectedModules(results.filter(r => r.detected).map(r => r.moduleKey))
      setStep(1)
    } catch (err) {
      setFileError(`Erreur de lecture : ${err.message}`)
    }
  }

  const toggleModule = (moduleKey) => {
    setSelectedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(k => k !== moduleKey)
        : [...prev, moduleKey]
    )
  }

  const handleImport = async () => {
    setImporting(true)
    setModuleProgress({})
    setModuleDone({})
    setGlobalReport(null)
    setStep(4)

    const plan = selectedModules.map(moduleKey => {
      const detection = detectionResults.find(r => r.moduleKey === moduleKey)
      return { moduleKey, rows, mapping: detection?.mapping || null }
    })

    try {
      const report = await importMultiModule(
        plan,
        (moduleKey, pct) => setModuleProgress(prev => ({ ...prev, [moduleKey]: pct })),
        (moduleKey, results) => setModuleDone(prev => ({ ...prev, [moduleKey]: results }))
      )
      setGlobalReport(report)
    } catch (err) {
      setGlobalReport({ _error: err.message })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setStep(0); setFile(null); setFileError(null); setDelimiter(';')
    setRows([]); setHeaders([]); setDetectionResults([]); setSelectedModules([])
    setModuleProgress({}); setModuleDone({}); setImporting(false); setGlobalReport(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="import-page">
      <div className="import-header">
        <div className="import-header-icon">
          <i className="ti ti-upload" aria-hidden="true"></i>
        </div>
        <div>
          <h1>Import CSV</h1>
          <p>Importez vos données vers PrestaShop via fichier CSV</p>
        </div>
      </div>

      <div className="stepper">
        {STEPS.map((label, idx) => (
          <div key={label} className={`step ${idx === step ? 'active' : ''} ${idx < step ? 'done' : ''}`}>
            <div className="step-circle">
              {idx < step ? <i className="ti ti-check" style={{ fontSize: 13 }}></i> : idx + 1}
            </div>
            <span className="step-label">{label}</span>
            {idx < STEPS.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      <div className="import-body">

        {/* Étape 0 : Upload */}
        {step === 0 && (
          <div>
            <p className="step-title">Choisissez un fichier CSV à importer</p>
            <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
              <i className="ti ti-upload" style={{ fontSize: 32, color: '#94a3b8' }} aria-hidden="true"></i>
              <p>Cliquez pour choisir un fichier CSV</p>
              <span>Taille maximale : {MAX_FILE_SIZE_MB}MB — le séparateur est détecté automatiquement</span>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            {fileError && (
              <div className="file-error">
                <i className="ti ti-alert-circle" aria-hidden="true"></i>
                <p>{fileError}</p>
              </div>
            )}
          </div>
        )}

        {/* Étape 1 : Détection */}
        {step === 1 && (
          <div>
            <div className="preview-meta" style={{ marginBottom: '1rem' }}>
              <span className="badge-blue"><i className="ti ti-file" aria-hidden="true"></i> {file?.name}</span>
              <span className="badge-gray">{rows.length} lignes</span>
              <span className="badge-gray">{headers.length} colonnes</span>
              <span className="badge-gray">séparateur « {delimiter === '\t' ? 'TAB' : delimiter} »</span>
            </div>
            <p className="step-title">Modules détectés dans ce fichier</p>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              La détection est automatique. Cochez ou décochez les modules à importer.
            </p>
            <div className="detection-grid">
              {detectionResults.map(({ moduleKey, label, detected, confidence, score }) => {
                const isSelected = selectedModules.includes(moduleKey)
                const conf = CONFIDENCE_LABEL[confidence] || CONFIDENCE_LABEL.none
                return (
                  <button
                    key={moduleKey}
                    className={`detection-card ${isSelected ? 'selected' : ''} ${detected ? 'auto-detected' : ''}`}
                    onClick={() => toggleModule(moduleKey)}
                  >
                    <div className="detection-card-top">
                      <i className={`ti ${MODULE_ICONS[moduleKey] || 'ti-database'}`} aria-hidden="true"></i>
                      <span className="detection-card-label">{label}</span>
                      {isSelected && <i className="ti ti-check detection-check" aria-hidden="true"></i>}
                    </div>
                    {score > 0 ? (
                      <span className="detection-confidence" style={{ color: conf.color }}>
                        {conf.label} (score {score})
                      </span>
                    ) : (
                      <span className="detection-confidence" style={{ color: '#94a3b8' }}>
                        Non détecté — sélection manuelle
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {selectedModules.length === 0 && (
              <div className="file-error" style={{ marginTop: '1rem' }}>
                <i className="ti ti-alert-circle" aria-hidden="true"></i>
                <p>Sélectionnez au moins un module à importer.</p>
              </div>
            )}
            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(0)}>← Retour</button>
              <button className="btn-primary" onClick={() => setStep(2)} disabled={selectedModules.length === 0}>
                Continuer ({selectedModules.length} module{selectedModules.length > 1 ? 's' : ''}) →
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : Configuration */}
        {step === 2 && (
          <div>
            <p className="step-title">Configuration</p>

            <div className="config-section">
              <p className="config-section-title">
                <i className="ti ti-settings" aria-hidden="true"></i>
                Séparateur de champs détecté
              </p>
              <div className="config-row">
                <div className="config-field">
                  <div className="separator-options">
                    {[';', ',', '|', '\t'].map((sep) => (
                      <button key={sep} className={`sep-btn ${delimiter === sep ? 'active' : ''}`} onClick={() => setDelimiter(sep)}>
                        {sep === '\t' ? 'TAB' : sep}
                      </button>
                    ))}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Détecté automatiquement. Modifiez si nécessaire.
                  </p>
                </div>
              </div>
            </div>

            {/* Liens inter-modules */}
            {selectedModules.length > 1 && (
              <div className="config-section">
                <p className="config-section-title">
                  <i className="ti ti-link" aria-hidden="true"></i>
                  Liens entre modules détectés
                </p>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Ces modules sont dans le même fichier — ils seront importés dans l'ordre avec injection automatique des IDs.
                </p>
                {selectedModules.map(mk => {
                  const link = MODULE_LINKS[mk]
                  if (!link) return null
                  const activeDeps = link.dependsOn.filter(d => selectedModules.includes(d))
                  if (activeDeps.length === 0) return null
                  return (
                    <div key={mk} className="mapping-block" style={{ marginBottom: '0.5rem' }}>
                      <div className="mapping-block-header">
                        <i className={`ti ${MODULE_ICONS[mk] || 'ti-database'}`} aria-hidden="true"></i>
                        <strong>{MODULES_CONFIG[mk]?.label}</strong>
                        <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                          ← dépend de {activeDeps.map(d => MODULES_CONFIG[d]?.label).join(', ')}
                        </span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0 1.5rem' }}>
                        {link.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="config-section">
              <p className="config-section-title">
                <i className="ti ti-list-check" aria-hidden="true"></i>
                Modules à importer et colonnes mappées
              </p>
              {selectedModules
                .slice()
                .sort((a, b) => (MODULES_CONFIG[a]?.importOrder ?? 99) - (MODULES_CONFIG[b]?.importOrder ?? 99))
                .map(moduleKey => {
                  const detection = detectionResults.find(r => r.moduleKey === moduleKey)
                  const mappingEntries = Object.entries(detection?.mapping || {})
                  return (
                    <div key={moduleKey} className="mapping-block">
                      <div className="mapping-block-header">
                        <i className={`ti ${MODULE_ICONS[moduleKey] || 'ti-database'}`} aria-hidden="true"></i>
                        <strong>{MODULES_CONFIG[moduleKey]?.label}</strong>
                        <span className="badge-gray" style={{ marginLeft: 'auto' }}>
                          ordre {MODULES_CONFIG[moduleKey]?.importOrder}
                        </span>
                      </div>
                      {mappingEntries.length > 0 ? (
                        <div className="mapping-list">
                          {mappingEntries.map(([csv, xml]) => (
                            <div key={csv} className="mapping-item">
                              <code className="mapping-csv">{csv}</code>
                              <i className="ti ti-arrow-right" style={{ color: '#94a3b8', fontSize: '0.75rem' }}></i>
                              <code className="mapping-xml">{xml}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                          Aucun mapping automatique
                        </p>
                      )}
                    </div>
                  )
                })}
            </div>

            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn-primary" onClick={() => setStep(3)}>Aperçu →</button>
            </div>
          </div>
        )}

        {/* Étape 3 : Aperçu */}
        {step === 3 && (
          <div>
            <div className="preview-meta">
              <span className="badge-blue"><i className="ti ti-file" aria-hidden="true"></i> {file?.name}</span>
              <span className="badge-gray">{rows.length} lignes</span>
              <span className="badge-gray">{headers.length} colonnes</span>
            </div>
            <p className="step-title" style={{ margin: '1rem 0 0.75rem' }}>
              Aperçu — {Math.min(PREVIEW_ROWS, rows.length)} premières lignes
            </p>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {headers.slice(0, 7).map(col => {
                      const mappedBy = selectedModules
                        .map(mk => {
                          const d = detectionResults.find(r => r.moduleKey === mk)
                          return d?.mapping?.[col] ? mk : null
                        })
                        .filter(Boolean)
                      return (
                        <th key={col}>
                          {col}
                          {mappedBy.length > 0 && (
                            <span className="th-required" title={`Mappé : ${mappedBy.join(', ')}`}>●</span>
                          )}
                        </th>
                      )
                    })}
                    {headers.length > 7 && <th>+{headers.length - 7} cols</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0, 7).map(col => (
                        <td key={col}>
                          {String(row[col] || '—').slice(0, 40)}
                          {String(row[col] || '').length > 40 ? '...' : ''}
                        </td>
                      ))}
                      {headers.length > 7 && <td className="more-cols">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="step-actions">
              <button className="btn-back" onClick={() => setStep(2)}>← Retour</button>
              <button className="btn-primary" onClick={handleImport}>
                <i className="ti ti-upload" aria-hidden="true"></i>
                Lancer l'import ({rows.length} lignes × {selectedModules.length} module{selectedModules.length > 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 : Import + rapport */}
        {step === 4 && (
          <div className="import-progress-section">
            <p className="step-title" style={{ marginBottom: '1.5rem' }}>
              {importing ? 'Import en cours...' : 'Import terminé'}
            </p>

            {selectedModules
              .slice()
              .sort((a, b) => (MODULES_CONFIG[a]?.importOrder ?? 99) - (MODULES_CONFIG[b]?.importOrder ?? 99))
              .map(moduleKey => {
                const pct = moduleProgress[moduleKey] ?? 0
                const done = moduleDone[moduleKey]
                const label = MODULES_CONFIG[moduleKey]?.label
                return (
                  <div key={moduleKey} className="module-progress-row">
                    <div className="module-progress-header">
                      <i className={`ti ${MODULE_ICONS[moduleKey] || 'ti-database'}`} aria-hidden="true"></i>
                      <span>{label}</span>
                      {done && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: done.errors.length === 0 ? '#22c55e' : '#f59e0b' }}>
                          {done.success} ok / {done.errors.length} erreur{done.errors.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {!done && importing && pct > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>{pct}%</span>
                      )}
                    </div>
                    <div className="progress-bar-wrapper">
                      <div
                        className="progress-bar"
                        style={{
                          width: done ? '100%' : `${pct}%`,
                          background: done ? (done.errors.length === 0 ? '#22c55e' : '#f59e0b') : undefined
                        }}
                      />
                    </div>
                  </div>
                )
              })}

            {globalReport && !importing && (
              <div className="report" style={{ marginTop: '1.5rem' }}>
                <div className="report-summary all-success">
                  {Object.entries(globalReport).map(([moduleKey, res]) => (
                    <div key={moduleKey} className="report-stat">
                      <strong>{MODULES_CONFIG[moduleKey]?.label}</strong>
                      <span className="report-number success">{res.success}</span>
                      <span className="report-stat-label">succès</span>
                      {res.errors.length > 0 && (
                        <span className="report-number error" style={{ marginLeft: 8 }}>
                          {res.errors.length} erreur{res.errors.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {Object.entries(globalReport).some(([, r]) => r.errors?.length > 0) && (
                  <div className="error-list">
                    <p className="error-list-title">
                      <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                      Détail des erreurs
                    </p>
                    {Object.entries(globalReport).map(([moduleKey, res]) =>
                      res.errors?.map((err, i) => (
                        <div key={`${moduleKey}-${i}`} className="error-item">
                          <span className="error-line">{MODULES_CONFIG[moduleKey]?.label} — Ligne {err.line}</span>
                          <span className="error-msg">{String(err.message).slice(0, 150)}</span>
                        </div>
                      ))
                    )}
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