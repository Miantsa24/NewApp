// src/pages/ResetPage.jsx

import { useState, useEffect } from 'react'
import ResetModuleItem from '../components/ResetModuleItem'
import { getResetStats, deleteAllSelected } from '../api/services/resetService'
import { MODULES_CONFIG } from '../api/utils/modulesConfig'
import './ResetPage.css'

const ResetPage = () => {
  const [stats, setStats] = useState({})
  const [loadingStats, setLoadingStats] = useState(true)
  
  const [selectedModules, setSelectedModules] = useState({})
  const [selectedSubEntities, setSelectedSubEntities] = useState({})
  
  const [statusPerModule, setStatusPerModule] = useState({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState(null) // { success: [], errors: [] }

  // Chargement des statistiques au montage
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingStats(true)
        const data = await getResetStats()
        setStats(data)

        // Tout cocher par défaut
        const initialModules = {}
        const initialSubs = {}

        Object.keys(data).forEach(key => {
          initialModules[key] = true
          initialSubs[key] = {}
          
          // Cocher toutes les sous-entités par défaut
          if (data[key].subEntities) {
            Object.keys(data[key].subEntities).forEach(subKey => {
              initialSubs[key][subKey] = true
            })
          }
        })

        setSelectedModules(initialModules)
        setSelectedSubEntities(initialSubs)
      } catch (err) {
        console.error("Erreur chargement stats reset :", err)
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  const handleModuleToggle = (moduleKey) => {
    setSelectedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }))
  }

  const handleSubToggle = (moduleKey, subKey) => {
    setSelectedSubEntities(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [subKey]: !prev[moduleKey]?.[subKey]
      }
    }))
  }

  const handleResetAll = async () => {
    setShowConfirm(false)
    setIsDeleting(true)
    setResult(null)
    setStatusPerModule({})

    try {
      const resultData = await deleteAllSelected(selectedModules, selectedSubEntities)
      
      // Mise à jour des statuts
      const newStatuses = {}
      resultData.success.forEach(item => {
        newStatuses[item.module] = 'success'
      })
      resultData.errors.forEach(item => {
        newStatuses[item.module] = 'error'
      })

      setStatusPerModule(newStatuses)
      setResult(resultData)
      
    } catch (err) {
      console.error(err)
      alert("Une erreur grave est survenue pendant la suppression.")
    } finally {
      setIsDeleting(false)
    }
  }

  const totalToDelete = Object.keys(selectedModules)
    .filter(key => selectedModules[key])
    .length

  if (loadingStats) {
    return <div className="reset-page loading">Chargement des statistiques...</div>
  }

  return (
    <div className="reset-page">
      <div className="reset-header">
        <div className="reset-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </div>
        <div>
          <h1>Réinitialisation des données</h1>
          <p>Opération irréversible. Les données seront supprimées définitivement.</p>
        </div>
      </div>

      {/* Liste des modules */}
      <div className="reset-modules-list">
        {Object.keys(MODULES_CONFIG).map(key => {
          const moduleStat = stats[key]
          if (!moduleStat) return null

          return (
            <ResetModuleItem
              key={key}
              moduleKey={key}
              label={moduleStat.label}
              count={moduleStat.mainCount}
              subEntities={moduleStat.subEntities}
              selected={selectedModules[key]}
              selectedSub={selectedSubEntities[key] || {}}
              onModuleToggle={handleModuleToggle}
              onSubToggle={handleSubToggle}
              status={statusPerModule[key]}
            />
          )
        })}
      </div>

      {/* Tableau récapitulatif */}
      <div className="reset-summary">
        <h3>Récapitulatif avant suppression</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Quantité principale</th>
              <th>Sous-entités sélectionnées</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(selectedModules).map(key => {
              if (!selectedModules[key]) return null
              const stat = stats[key]
              const subs = selectedSubEntities[key] || {}
              const selectedSubsCount = Object.values(subs).filter(Boolean).length

              return (
                <tr key={key}>
                  <td><strong>{stat.label}</strong></td>
                  <td>{stat.mainCount}</td>
                  <td>{selectedSubsCount > 0 ? `${selectedSubsCount} sous-entités` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bouton Tout Supprimer */}
      <div className="reset-all-section">
        {!showConfirm ? (
          <button 
            className="btn-delete-all"
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting || totalToDelete === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Tout supprimer ({totalToDelete} module{totalToDelete > 1 ? 's' : ''})
          </button>
        ) : (
          <div className="confirm-box">
            <h3>⚠️ Confirmation finale</h3>
            <p>Cette action est <strong>irréversible</strong>.<br />
               Voulez-vous vraiment supprimer les données sélectionnées ?</p>
            
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                Annuler
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handleResetAll}
                disabled={isDeleting}
              >
                {isDeleting ? 'Suppression en cours...' : 'Oui, tout supprimer maintenant'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Résultat final */}
      {result && (
        <div className="reset-result">
          <h3>Résultat de l'opération</h3>
          {result.success.length > 0 && (
            <div className="success-list">
              <strong>✅ Supprimés avec succès :</strong>
              <ul>{result.success.map(s => <li key={s.module}>{s.label}</li>)}</ul>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="error-list">
              <strong>❌ Erreurs :</strong>
              <ul>{result.errors.map(e => <li key={e.module}>{e.label} — {e.error}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResetPage