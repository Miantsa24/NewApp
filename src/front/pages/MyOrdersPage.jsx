import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FrontLayout from '../FrontLayout'
import { frontIsAuthenticated, frontGetCurrentUser } from '../services/frontAuthService'
import { fetchOrderItems } from '../services/orderService'
import useMyOrders from '../hooks/useMyOrders'
import './MyOrdersPage.css'

const MyOrdersPage = () => {
  const navigate = useNavigate()
  const user     = frontGetCurrentUser()

  if (!frontIsAuthenticated()) {
    return (
      <FrontLayout>
        <div className="my-orders-empty">
          <i className="ti ti-lock"></i>
          <p>Connectez-vous pour voir vos commandes.</p>
          <button onClick={() => navigate('/shop/login')}>Se connecter</button>
        </div>
      </FrontLayout>
    )
  }

  return (
    <FrontLayout>
      <MyOrdersContent user={user} navigate={navigate} />
    </FrontLayout>
  )
}

const MyOrdersContent = ({ user, navigate }) => {
  const { orders, loading, error } = useMyOrders(user?.id)

  // reorderMap : { [orderId]: { open, multiplier, items, loading } }
  const [reorderMap, setReorderMap] = useState({})

  const handleReorderOpen = async (orderId) => {
    setReorderMap(prev => ({
      ...prev,
      [orderId]: { open: true, multiplier: 1, items: [], loading: true },
    }))
    try {
      const items = await fetchOrderItems(orderId)
      setReorderMap(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], items, loading: false },
      }))
    } catch {
      setReorderMap(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], loading: false },
      }))
    }
  }

  const handleReorderClose = (orderId) => {
    setReorderMap(prev => { const n = { ...prev }; delete n[orderId]; return n })
  }

  const handleReorderAdd = (orderId, reference, multiplier, items) => {
    navigate('/shop/reorder-confirm', { state: { items, multiplier, orderId, reference } })
  }

  if (loading) {
    return (
      <div className="my-orders-status">
        <i className="ti ti-loader-2 spin"></i>
        Chargement de vos commandes...
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-orders-status my-orders-error">
        <i className="ti ti-alert-circle"></i>
        Erreur : {error}
      </div>
    )
  }

  return (
    <div className="my-orders-wrapper">
      <div className="my-orders-header">
        <h1 className="my-orders-title">Mes commandes</h1>
        <span className="my-orders-count">
          {orders.length} commande{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="my-orders-empty">
          <i className="ti ti-clipboard-list"></i>
          <p>Vous n'avez pas encore de commande.</p>
          <button onClick={() => navigate('/shop/products')}>Découvrir nos produits</button>
        </div>
      ) : (
        <div className="my-orders-table-wrap">
          <table className="my-orders-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>État</th>
                <th>Total TTC</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((item) => {
                const rs = reorderMap[item.id]
                return (
                  <tr key={item.id}>
                    <td className="my-orders-ref">
                      {item.reference !== '—'
                        ? <strong>{item.reference}</strong>
                        : <span className="my-orders-dash">—</span>
                      }
                    </td>
                    <td>
                      <span
                        className="my-orders-badge"
                        style={{
                          background: `${item.stateColor}22`,
                          color:      item.stateColor,
                          border:     `0.5px solid ${item.stateColor}55`,
                        }}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="my-orders-total">
                      {item.totalTTC !== '0.00' ? `${item.totalTTC} €` : '—'}
                    </td>
                    <td className="my-orders-date">{item.dateAdd}</td>
                    <td>

                      {/* Panier : Finaliser */}
                      {(item.type === 'cart' || (item.state || '').toLowerCase() === 'dans le panier') && (
                        <button
                          className="my-orders-action-btn"
                          onClick={() => navigate('/shop/cart')}
                        >
                          <i className="ti ti-shopping-cart"></i>
                          Finaliser
                        </button>
                      )}

                      {/* Commande paiement effectué (stateId=2) : +commande */}
                      {item.type === 'order' && item.stateId === '2' && (
                        <>
                          {!rs?.open ? (
                            <button
                              className="my-orders-reorder-btn"
                              onClick={() => handleReorderOpen(item.id)}
                            >
                              <i className="ti ti-copy-plus"></i>
                              +commande
                            </button>
                          ) : (
                            <div className="reorder-panel">
                              {rs.loading ? (
                                <i className="ti ti-loader-2 spin"></i>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={rs.multiplier}
                                    onChange={e => setReorderMap(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        multiplier: Math.max(1, parseInt(e.target.value) || 1),
                                      },
                                    }))}
                                    className="reorder-mult-input"
                                  />
                                  <button
                                    className="reorder-add-btn"
                                    onClick={() => handleReorderAdd(
                                      item.id,
                                      item.reference,
                                      rs.multiplier,
                                      rs.items,
                                    )}
                                  >
                                    Ajouter
                                  </button>
                                  <button
                                    className="reorder-cancel-btn"
                                    onClick={() => handleReorderClose(item.id)}
                                  >
                                    <i className="ti ti-x"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}

                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MyOrdersPage
