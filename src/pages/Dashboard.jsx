import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllProducts } from '../api/services/productService'
import { getAllCustomers } from '../api/services/customersService'
import { getAllOrders } from '../api/services/ordersService'
import './Dashboard.css'

const StatCard = ({ label, value, sub, icon, color, onClick }) => (
  <div className={`stat-card stat-${color}`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="stat-card-top">
      <div className="stat-icon">
        <i className={`ti ${icon}`} aria-hidden="true"></i>
      </div>
      <span className="stat-label">{label}</span>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-sub">{sub}</div>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ products: '—', customers: '—', orders: '—' })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsData, customersData, ordersData] = await Promise.all([
          getAllProducts(),
          getAllCustomers(),
          getAllOrders(),
        ])

        const productList = productsData?.prestashop?.products?.product
        const customerList = customersData?.prestashop?.customers?.customer
        const orderList = ordersData?.prestashop?.orders?.order

        const toArray = (data) =>
          !data ? [] : Array.isArray(data) ? data : [data]

        const products = toArray(productList)
        const customers = toArray(customerList)
        const orders = toArray(orderList)

        setCounts({
          products: products.length,
          customers: customers.length,
          orders: orders.length,
        })

        // Activité récente simulée depuis les données réelles
        const newActivity = []
        if (products.length > 0)
          newActivity.push({ color: 'blue', text: `${products.length} produits chargés`, time: 'maintenant' })
        if (customers.length > 0)
          newActivity.push({ color: 'green', text: `${customers.length} clients enregistrés`, time: 'maintenant' })
        if (orders.length > 0)
          newActivity.push({ color: 'amber', text: `${orders.length} commandes trouvées`, time: 'maintenant' })

        setActivity(newActivity)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="dashboard">

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Produits"
          value={loading ? '...' : counts.products}
          sub="dans le catalogue"
          icon="ti-box"
          color="blue"
          onClick={() => navigate('/products')}
        />
        <StatCard
          label="Clients"
          value={loading ? '...' : counts.customers}
          sub="comptes enregistrés"
          icon="ti-users"
          color="green"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          label="Commandes"
          value={loading ? '...' : counts.orders}
          sub="au total"
          icon="ti-clipboard-list"
          color="amber"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          label="Modules"
          value="6"
          sub="disponibles à l'import"
          icon="ti-database"
          color="purple"
          onClick={() => navigate('/import')}
        />
      </div>

      <div className="dashboard-row">

        {/* Activité récente */}
        <div className="dash-card">
          <p className="dash-card-title">
            <i className="ti ti-activity" aria-hidden="true"></i>
            Activité récente
          </p>
          {loading ? (
            <p className="dash-empty">Chargement...</p>
          ) : activity.length === 0 ? (
            <p className="dash-empty">Aucune activité récente</p>
          ) : (
            activity.map((item, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-dot dot-${item.color}`}></div>
                <span className="activity-text">{item.text}</span>
                <span className="activity-time">{item.time}</span>
              </div>
            ))
          )}
        </div>

        {/* Actions rapides */}
        <div className="dash-card">
          <p className="dash-card-title">
            <i className="ti ti-bolt" aria-hidden="true"></i>
            Actions rapides
          </p>
          <div className="quick-actions">
            <button className="quick-btn" onClick={() => navigate('/import')}>
              <div className="quick-btn-icon blue">
                <i className="ti ti-upload" aria-hidden="true"></i>
              </div>
              <div>
                <p className="quick-btn-label">Importer un CSV</p>
                <p className="quick-btn-sub">Produits, clients, commandes...</p>
              </div>
              <i className="ti ti-chevron-right quick-btn-arrow" aria-hidden="true"></i>
            </button>
            <button className="quick-btn" onClick={() => navigate('/reset')}>
              <div className="quick-btn-icon red">
                <i className="ti ti-refresh" aria-hidden="true"></i>
              </div>
              <div>
                <p className="quick-btn-label">Réinitialiser les données</p>
                <p className="quick-btn-sub">Supprimer toutes les données</p>
              </div>
              <i className="ti ti-chevron-right quick-btn-arrow" aria-hidden="true"></i>
            </button>
            <button className="quick-btn" onClick={() => navigate('/products')}>
              <div className="quick-btn-icon amber">
                <i className="ti ti-box" aria-hidden="true"></i>
              </div>
              <div>
                <p className="quick-btn-label">Voir les produits</p>
                <p className="quick-btn-sub">{loading ? '...' : `${counts.products} produits`}</p>
              </div>
              <i className="ti ti-chevron-right quick-btn-arrow" aria-hidden="true"></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard