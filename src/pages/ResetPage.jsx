import { useState } from 'react'
import { deleteAllProducts } from '../api/services/productService'
import { deleteAllCustomers } from '../api/services/customersService'
import { deleteAllOrders } from '../api/services/ordersService'
import './ResetPage.css'

const actions = [
  {
    key: 'products',
    label: 'Produits',
    description: 'Supprimer tous les produits du catalogue',
    fn: deleteAllProducts,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
  },
  {
    key: 'customers',
    label: 'Clients',
    description: 'Supprimer tous les comptes clients',
    fn: deleteAllCustomers,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'orders',
    label: 'Commandes',
    description: 'Supprimer toutes les commandes',
    fn: deleteAllOrders,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
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