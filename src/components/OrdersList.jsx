import useEnrichedOrders from '../hooks/useEnrichedOrders'
import './List.css'

const OrdersList = () => {
  const { orders, loading, error } = useEnrichedOrders()

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
          {orders.map((order) => (
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
              <td>
                <span
                  className="order-state-badge"
                  style={{ background: `${order.stateColor}22`, color: order.stateColor, border: `0.5px solid ${order.stateColor}55` }}
                >
                  {order.state}
                </span>
              </td>
              <td className="date-cell">{order.dateAdd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrdersList