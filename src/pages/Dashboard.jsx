import { useNavigate } from 'react-router-dom'
import useEnrichedProducts from '../hooks/useEnrichedProducts'
import useEnrichedCustomers from '../hooks/useEnrichedCustomers'
import useEnrichedOrders from '../hooks/useEnrichedOrders'
import useEnrichedStock from '../hooks/useEnrichedStock'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()

  const { products, loading: loadingP } = useEnrichedProducts()
  const { customers, loading: loadingC } = useEnrichedCustomers()
  const { orders,   loading: loadingO } = useEnrichedOrders()
  const { stock,    loading: loadingS } = useEnrichedStock()

  const loading = loadingP || loadingC || loadingO || loadingS

  // Stats calculées depuis les données enrichies
  const stats = {
    totalProducts:   products.length,
    activeProducts:  products.filter(p => p.active == 1).length,
    totalCustomers:  customers.length,
    activeCustomers: customers.filter(c => c.active == 1).length,
    totalOrders:     orders.length,
    totalRevenue:    orders
      .reduce((sum, o) => sum + parseFloat(o.totalTTC || 0), 0)
      .toFixed(2),
    outOfStock:      stock.filter(s => s.outOfStock).length,
    lowStock:        stock.filter(s => s.lowStock).length,
  }

  // 5 dernières commandes
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.dateAdd) - new Date(a.dateAdd))
    .slice(0, 5)

  // Top 5 produits par ordre d'apparition
  const recentProducts = products.slice(0, 5)

  return (
    <div className="dashboard">

      {/* Stats principales */}
      <div className="stats-grid">
        <div className="stat-card stat-blue" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Produits</span>
            <div className="stat-icon">
              <i className="ti ti-box" aria-hidden="true"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? '...' : stats.totalProducts}</div>
          <div className="stat-sub">{loading ? '' : `${stats.activeProducts} actifs`}</div>
        </div>

        <div className="stat-card stat-green" onClick={() => navigate('/customers')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Clients</span>
            <div className="stat-icon">
              <i className="ti ti-users" aria-hidden="true"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? '...' : stats.totalCustomers}</div>
          <div className="stat-sub">{loading ? '' : `${stats.activeCustomers} actifs`}</div>
        </div>

        <div className="stat-card stat-amber" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Commandes</span>
            <div className="stat-icon">
              <i className="ti ti-clipboard-list" aria-hidden="true"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? '...' : stats.totalOrders}</div>
          <div className="stat-sub">{loading ? '' : `${stats.totalRevenue} € total`}</div>
        </div>

        <div className="stat-card stat-red" onClick={() => navigate('/stock')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Ruptures de stock</span>
            <div className="stat-icon">
              <i className="ti ti-package" aria-hidden="true"></i>
            </div>
          </div>
          <div className="stat-value">{loading ? '...' : stats.outOfStock}</div>
          <div className="stat-sub">{loading ? '' : `${stats.lowStock} en stock faible`}</div>
        </div>
      </div>

      <div className="dashboard-row">

        {/* Dernières commandes */}
        <div className="dash-card">
          <div className="dash-card-header">
            <p className="dash-card-title">
              <i className="ti ti-clock" aria-hidden="true"></i>
              Dernières commandes
            </p>
            <button className="dash-card-link" onClick={() => navigate('/orders')}>
              Voir tout →
            </button>
          </div>
          {loading ? (
            <p className="dash-empty">Chargement...</p>
          ) : recentOrders.length === 0 ? (
            <p className="dash-empty">Aucune commande</p>
          ) : (
            <table className="dash-mini-table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.reference}</strong></td>
                    <td>{order.customer}</td>
                    <td className="price">{order.totalTTC} €</td>
                    <td>
                      <span
                        className="order-state-badge"
                        style={{
                          background: `${order.stateColor}22`,
                          color: order.stateColor,
                          border: `0.5px solid ${order.stateColor}55`
                        }}
                      >
                        {order.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Produits récents + actions rapides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Alertes stock */}
          {!loading && (stats.outOfStock > 0 || stats.lowStock > 0) && (
            <div className="dash-card dash-alert">
              <p className="dash-card-title">
                <i className="ti ti-alert-triangle" style={{ color: '#f59e0b' }} aria-hidden="true"></i>
                Alertes stock
              </p>
              {stats.outOfStock > 0 && (
                <div className="alert-item alert-red">
                  <i className="ti ti-circle-x" aria-hidden="true"></i>
                  <span><strong>{stats.outOfStock}</strong> produit(s) en rupture de stock</span>
                  <button className="alert-btn" onClick={() => navigate('/stock')}>Voir →</button>
                </div>
              )}
              {stats.lowStock > 0 && (
                <div className="alert-item alert-amber">
                  <i className="ti ti-alert-circle" aria-hidden="true"></i>
                  <span><strong>{stats.lowStock}</strong> produit(s) en stock faible</span>
                  <button className="alert-btn" onClick={() => navigate('/stock')}>Voir →</button>
                </div>
              )}
            </div>
          )}

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
                  <p className="quick-btn-label">Réinitialiser</p>
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
                  <p className="quick-btn-sub">{loading ? '...' : `${stats.totalProducts} produits`}</p>
                </div>
                <i className="ti ti-chevron-right quick-btn-arrow" aria-hidden="true"></i>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Produits récents */}
      <div className="dash-card">
        <div className="dash-card-header">
          <p className="dash-card-title">
            <i className="ti ti-box" aria-hidden="true"></i>
            Produits récents
          </p>
          <button className="dash-card-link" onClick={() => navigate('/products')}>
            Voir tout →
          </button>
        </div>
        {loading ? (
          <p className="dash-empty">Chargement...</p>
        ) : recentProducts.length === 0 ? (
          <p className="dash-empty">Aucun produit</p>
        ) : (
          <table className="dash-mini-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Prix HT</th>
                <th>Prix TTC</th>
                <th>Stock</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {recentProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="product-thumb"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="product-thumb-placeholder">
                        <i className="ti ti-photo" aria-hidden="true"></i>
                      </div>
                    )}
                  </td>
                  <td className="name">{p.name}</td>
                  <td className="muted">{p.categoryDefault}</td>
                  <td className="price">{p.priceHT} €</td>
                  <td className="price">{p.priceTTC} €</td>
                  <td>
                    <span className={`stock-qty ${p.quantity <= 0 ? 'stock-out' : p.quantity <= 5 ? 'stock-low' : 'stock-ok'}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${p.active == 1 ? 'status-active' : 'status-inactive'}`}>
                      {p.active == 1 ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}

export default Dashboard