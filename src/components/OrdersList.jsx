import { useState } from 'react'
import useEnrichedOrders from '../hooks/useEnrichedOrders'
import { updateOrderState, ORDER_STATES } from '../api/services/ordersService'
import './List.css'

// Les 3 états disponibles dans le dropdown
const STATE_OPTIONS = [
  {
    id: ORDER_STATES.IN_CART,
    label: 'Dans le panier',
    icon: 'ti-shopping-cart',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    virtual: true, // État virtuel — pas de PUT vers PrestaShop
  },
  {
    id: ORDER_STATES.PAYMENT_ACCEPTED,
    label: 'Paiement effectué',
    icon: 'ti-circle-check',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    virtual: false,
  },
  {
    id: ORDER_STATES.CANCELLED,
    label: 'Annulé',
    icon: 'ti-ban',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#e2e8f0',
    virtual: false,
  },
]

const OrdersList = () => {
  const { orders, loading, error } = useEnrichedOrders()

  // updatingId : id de la commande en cours de mise à jour
  const [updatingId, setUpdatingId] = useState(null)
  // openDropdownId : id de la commande dont le dropdown est ouvert
  const [openDropdownId, setOpenDropdownId] = useState(null)
  // updateError : { id, message } erreur sur une ligne
  const [updateError, setUpdateError] = useState(null)
  // localStates : { [orderId]: { state, stateColor } } états mis à jour localement
  const [localStates, setLocalStates] = useState({})

  if (loading) return <div className="loading">Chargement des commandes...</div>
  if (error) return <div className="error">{error}</div>

  if (orders.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-clipboard-list" aria-hidden="true"></i>
      <p>Aucune commande détectée</p>
      <span>Importez des commandes via la page Import CSV</span>
    </div>
  )

  const handleStateChange = async (orderId, stateOption) => {
    setOpenDropdownId(null)
    setUpdatingId(orderId)
    setUpdateError(null)

    try {
      if (!stateOption.virtual) {
        // État réel PrestaShop → PUT
        await updateOrderState(orderId, stateOption.id)
      }
      // État virtuel (IN_CART) → pas de PUT, mise à jour locale uniquement

      setLocalStates((prev) => ({
        ...prev,
        [orderId]: {
          state: stateOption.label,
          stateColor: stateOption.color,
        },
      }))
    } catch (err) {
      setUpdateError({ id: orderId, message: 'Erreur lors de la mise à jour' })
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Commandes</h1>
        <span className="badge">{orders.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Référence</th>
            <th>Client</th>
            <th>Transporteur</th>
            <th>Total HT</th>
            <th>Total TTC</th>
            <th>Devise</th>
            <th>Produits</th>
            <th>État</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const local = localStates[order.id]
            const currentState      = local?.state      || order.state
            const currentStateColor = local?.stateColor || order.stateColor
            const isUpdating        = updatingId === order.id
            const isOpen            = openDropdownId === order.id
            const hasError          = updateError?.id === order.id

            return (
              <tr key={order.id}>
                <td className="id-cell">#{order.id}</td>
                <td><strong>{order.reference}</strong></td>
                <td className="name-cell">{order.customer}</td>
                <td className="date-cell">{order.carrier}</td>
                <td className="price-cell">{order.totalHT} Ar</td>
                <td className="price-cell">{order.totalTTC} Ar</td>
                <td className="date-cell">{order.currency}</td>
                <td>
                  <span className="count-badge">
                    <i className="ti ti-box" aria-hidden="true"></i>
                    {order.productCount}
                  </span>
                </td>

                {/* Colonne État — dropdown interactif */}
                <td>
                  <div className="state-cell">
                    {isUpdating ? (
                      // Spinner pendant la mise à jour
                      <span className="state-updating">
                        <i className="ti ti-loader-2 spin" aria-hidden="true"></i>
                        Mise à jour...
                      </span>
                    ) : (
                      <div className="state-dropdown-wrapper">
                        {/* Badge cliquable */}
                        <button
                          className="order-state-btn"
                          style={{
                            background: `${currentStateColor}22`,
                            color: currentStateColor,
                            border: `0.5px solid ${currentStateColor}55`,
                          }}
                          onClick={() => setOpenDropdownId(isOpen ? null : order.id)}
                        >
                          {currentState}
                          <i className="ti ti-chevron-down" aria-hidden="true"></i>
                        </button>

                        {/* Dropdown */}
                        {isOpen && (
                          <div className="state-dropdown">
                            <p className="state-dropdown-label">Changer l'état</p>
                            {STATE_OPTIONS.map((option) => (
                              <button
                                key={option.id}
                                className="state-option"
                                style={{ color: option.color }}
                                onClick={() => handleStateChange(order.id, option)}
                              >
                                <i className={`ti ${option.icon}`} aria-hidden="true"></i>
                                {option.label}
                                {option.virtual && (
                                  <span className="state-option-tag">local</span>
                                )}
                              </button>
                            ))}
                            <button
                              className="state-option state-option-cancel"
                              onClick={() => setOpenDropdownId(null)}
                            >
                              <i className="ti ti-x" aria-hidden="true"></i>
                              Fermer
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Erreur sur cette ligne */}
                    {hasError && (
                      <p className="state-error">{updateError.message}</p>
                    )}
                  </div>
                </td>

                <td className="date-cell">{order.dateAdd}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default OrdersList