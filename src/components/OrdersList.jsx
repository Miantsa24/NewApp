import { useEffect, useState } from 'react'
import { getAllOrders, getOrderById } from '../api/services/ordersService'
import './List.css'

const OrdersList = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getAllOrders()
        const ordersList = data?.prestashop?.orders?.order

        if (!ordersList) {
          setOrders([])
          return
        }

        const ordersArray = Array.isArray(ordersList) ? ordersList : [ordersList]

        const ordersDetails = await Promise.all(
          ordersArray.map(async (order) => {
            const detail = await getOrderById(order['@_id'])
            return detail?.prestashop?.order
          })
        )

        setOrders(ordersDetails.filter(Boolean))
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  if (loading) return <div className="loading">Chargement des commandes...</div>
  if (error) return <div className="error">{error}</div>

  if (orders.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-clipboard-list" aria-hidden="true"></i>
      <p>Aucune commande détectée</p>
      <span>Importez des commandes via la page Import CSV</span>
    </div>
  )

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
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order['@_id'] || order?.id}>
              <td className="id-cell">#{order?.id}</td>
              <td><strong>{order?.reference || '—'}</strong></td>
              <td className="price-cell">{parseFloat(order?.total_paid).toFixed(2)} €</td>
              <td className="date-cell">{order?.date_add?.split(' ')[0] || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrdersList