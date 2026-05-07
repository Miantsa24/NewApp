import { useState } from 'react'
import { deleteAllProducts } from '../api/services/productService'
import { deleteAllCustomers } from '../api/services/customersService'
import { deleteAllOrders } from '../api/services/ordersService'
import { deleteAllCategories } from '../api/services/categoriesService'
import { deleteAllCombinations } from '../api/services/combinationsService'
import './ResetPage.css'

const actions = [
  {
    key: 'products',
    label: 'Produits',
    description: 'Supprimer tous les produits du catalogue',
    fn: deleteAllProducts,
    icon: <i className="ti ti-box" style={{ fontSize: 22 }} aria-hidden="true"></i>,
  },
  {
    key: 'categories',
    label: 'Catégories',
    description: 'Supprimer toutes les catégories (sauf racine)',
    fn: deleteAllCategories,
    icon: <i className="ti ti-folder" style={{ fontSize: 22 }} aria-hidden="true"></i>,
  },
  {
    key: 'combinations',
    label: 'Déclinaisons',
    description: 'Supprimer toutes les déclinaisons',
    fn: deleteAllCombinations,
    icon: <i className="ti ti-adjustments" style={{ fontSize: 22 }} aria-hidden="true"></i>,
  },
  {
    key: 'customers',
    label: 'Clients',
    description: 'Supprimer tous les comptes clients',
    fn: deleteAllCustomers,
    icon: <i className="ti ti-users" style={{ fontSize: 22 }} aria-hidden="true"></i>,
  },
  {
    key: 'orders',
    label: 'Commandes',
    description: 'Supprimer toutes les commandes',
    fn: deleteAllOrders,
    icon: <i className="ti ti-clipboard-list" style={{ fontSize: 22 }} aria-hidden="true"></i>,
  },
]

const ResetPage = () => {
  const [statuses, setStatuses] = useState({})
  const [confirmAll, setConfirmAll] = useState(false)

  const handleReset = async (key, fn) => {
    setStatuses((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      await fn()
      setStatuses((prev) => ({ ...prev, [key]: 'success' }))
    } catch (err) {
      console.error(err)
      setStatuses((prev) => ({ ...prev, [key]: 'error' }))
    }
  }

  const handleResetAll = async () => {
    for (const action of actions) {
      await handleReset(action.key, action.fn)
    }
    setConfirmAll(false)
  }

  const getStatusLabel = (key) => {
    if (statuses[key] === 'loading') return <span className="status-badge loading">Suppression...</span>
    if (statuses[key] === 'success') return <span className="status-badge success">Supprimé</span>
    if (statuses[key] === 'error') return <span className="status-badge error">Erreur</span>
    return null
  }

  return (
    <div className="reset-page">

      <div className="reset-header">
        <div className="reset-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <div>
          <h1>Réinitialisation des données</h1>
          <p>Les suppressions sont définitives et irréversibles.</p>
        </div>
      </div>

      <div className="reset-cards">
        {actions.map((action) => (
          <div className="reset-card" key={action.key}>
            <div className="reset-card-left">
              <div className="reset-card-icon">{action.icon}</div>
              <div>
                <p className="reset-card-title">{action.label}</p>
                <p className="reset-card-desc">{action.description}</p>
              </div>
            </div>
            <div className="reset-card-right">
              {getStatusLabel(action.key)}
              <button
                className="btn-delete"
                onClick={() => handleReset(action.key, action.fn)}
                disabled={statuses[action.key] === 'loading'}
              >
                {statuses[action.key] === 'loading' ? 'En cours...' : 'Supprimer'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="reset-all-section">
        {!confirmAll ? (
          <button className="btn-delete-all" onClick={() => setConfirmAll(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Tout supprimer
          </button>
        ) : (
          <div className="confirm-box">
            <p>Confirmer la suppression de toutes les données ?</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={() => setConfirmAll(false)}>Annuler</button>
              <button className="btn-confirm-delete" onClick={handleResetAll}>Oui, tout supprimer</button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default ResetPage