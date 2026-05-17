import { useState } from 'react'
import useEnrichedOrders from '../hooks/useEnrichedOrders'
import { updateOrderState, createOrderFromCart, deleteCart, ORDER_STATES } from '../api/services/ordersService'
import './List.css'

const PAYMENT_OPTION = {
  id: ORDER_STATES.PAYMENT_ACCEPTED,
  label: 'Paiement effectué',
  icon: 'ti-circle-check',
  color: '#16a34a',
}

const CANCELLED_OPTION = {
  id: ORDER_STATES.CANCELLED,
  label: 'Annulé',
  icon: 'ti-ban',
  color: '#64748b',
}

// stateName est utilisé pour détecter l'état "Dans le panier" via l'état PS créé à l'import
const getStateOptions = (stateId, stateName) => {
  const isInCart = stateId === ORDER_STATES.IN_CART
    || (stateName || '').toLowerCase() === 'dans le panier'
  if (isInCart)                                  return [PAYMENT_OPTION, CANCELLED_OPTION]
  if (stateId === ORDER_STATES.PAYMENT_ACCEPTED) return [CANCELLED_OPTION]
  if (stateId === ORDER_STATES.CANCELLED)        return [PAYMENT_OPTION]
  return [PAYMENT_OPTION, CANCELLED_OPTION]
}

const OrdersList = () => {
  const { orders, loading, error, refresh } = useEnrichedOrders()

  const [updatingId,     setUpdatingId]     = useState(null)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [updateError,    setUpdateError]    = useState(null)
  const [localStates,    setLocalStates]    = useState({})

  if (loading) return <div className="loading">Chargement des commandes...</div>
  if (error)   return <div className="error">{error}</div>

  if (orders.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-clipboard-list" aria-hidden="true"></i>
      <p>Aucune commande détectée</p>
      <span>Importez des commandes via la page Import CSV</span>
    </div>
  )

  const handleStateChange = async (item, stateOption) => {
    setOpenDropdownId(null)
    setUpdatingId(item.id)
    setUpdateError(null)

    try {
      if (item.type === 'cart') {
        if (stateOption.id === ORDER_STATES.PAYMENT_ACCEPTED) {
          await createOrderFromCart(item)
        } else {
          await deleteCart(item.rawCartId)
        }
        refresh()
      } else {
        await updateOrderState(item.id, stateOption.id)
        setLocalStates((prev) => ({
          ...prev,
          [item.id]: {
            state:      stateOption.label,
            stateColor: stateOption.color,
            stateId:    stateOption.id,
          },
        }))
      }
    } catch (err) {
      setUpdateError({ id: item.id, message: 'Erreur lors de la mise à jour' })
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
            const local             = localStates[order.id]
            const currentState      = local?.state      || order.state
            const currentStateColor = local?.stateColor || order.stateColor
            const currentStateId    = local?.stateId    || order.stateId
            const isUpdating        = updatingId === order.id
            const isOpen            = openDropdownId === order.id
            const hasError          = updateError?.id === order.id
            const stateOptions      = getStateOptions(currentStateId, currentState)

            return (
              <tr key={order.id}>
                <td className="id-cell">#{order.id}</td>
                <td><strong>{order.reference}</strong></td>
                <td className="name-cell">{order.customer}</td>
                <td className="date-cell">{order.carrier}</td>
                <td className="price-cell">{order.totalHT} €</td>
                <td className="price-cell">{order.totalTTC} €</td>
                <td className="date-cell">{order.currency}</td>
                <td>
                  <span className="count-badge">
                    <i className="ti ti-box" aria-hidden="true"></i>
                    {order.productCount}
                  </span>
                </td>

                <td>
                  <div className="state-cell">
                    {isUpdating ? (
                      <span className="state-updating">
                        <i className="ti ti-loader-2 spin" aria-hidden="true"></i>
                        Mise à jour...
                      </span>
                    ) : (
                      <div className="state-dropdown-wrapper">
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

                        {isOpen && (
                          <div className="state-dropdown">
                            <p className="state-dropdown-label">Changer l'état</p>
                            {stateOptions.map((option) => (
                              <button
                                key={option.id}
                                className="state-option"
                                style={{ color: option.color }}
                                onClick={() => handleStateChange(order, option)}
                              >
                                <i className={`ti ${option.icon}`} aria-hidden="true"></i>
                                {option.label}
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
