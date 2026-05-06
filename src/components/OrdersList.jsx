import { useEffect, useState } from 'react'
import { getAllOrders, getOrderById } from '../api/services/ordersService'

const OrdersList = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getAllOrders()
        const ordersList = data?.prestashop?.orders?.order
        const ordersArray = Array.isArray(ordersList) ? ordersList : [ordersList]

        const ordersDetails = await Promise.all(
          ordersArray.map(async (order) => {
            const detail = await getOrderById(order['@_id'])
            return detail?.prestashop?.order
          })
        )

        setOrders(ordersDetails)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h1>Orders PrestaShop</h1>
      <ul>
        {orders.map((order) => (
          <li key={order['@_id'] || order?.id}>
            <strong>{order?.reference}</strong>
            {' - '}
            {order?.total_paid} €
          </li>
        ))}
      </ul>
    </div>
  )
}

export default OrdersList