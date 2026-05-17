import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useEnrichedProducts from '../hooks/useEnrichedProducts'
import useEnrichedCustomers from '../hooks/useEnrichedCustomers'
import useEnrichedOrders from '../hooks/useEnrichedOrders'
import useEnrichedStock from '../hooks/useEnrichedStock'
import './Dashboard.css'

const today = new Date().toISOString().split('T')[0]

const Dashboard = () => {
  const navigate = useNavigate()
  const [searchDate, setSearchDate] = useState('')

  const { products, loading: loadingP } = useEnrichedProducts()
  const { customers, loading: loadingC } = useEnrichedCustomers()
  const { orders,    loading: loadingO } = useEnrichedOrders()
  const { stock,     loading: loadingS } = useEnrichedStock()

  const loading = loadingP || loadingC || loadingO || loadingS

  const stats = {
    totalProducts:  products.length,
    activeProducts: products.filter(p => p.active == 1).length,
    totalCustomers: customers.length,
    activeCustomers:customers.filter(c => c.active == 1).length,
    totalOrders:    orders.length,
    totalRevenue:   orders.reduce((s, o) => s + parseFloat(o.totalTTC || 0), 0).toFixed(2),
    outOfStock:     stock.filter(s => s.outOfStock).length,
    lowStock:       stock.filter(s => s.lowStock).length,
  }

  // Seuls les états pertinents pour le dashboard
  const DASHBOARD_STATES = ['cart', '2'] // dans le panier (virtuel) + paiement accepté
  const relevantOrders = orders.filter(o =>
    DASHBOARD_STATES.includes(o.stateId)
    || o.type === 'cart'
    || (o.state || '').toLowerCase() === 'dans le panier'
  )

  // "Aujourd'hui" : uniquement les items avec date_add = aujourd'hui
  // (dans le panier OU paiement accepté, mais seulement s'ils datent d'aujourd'hui)
  const todayOrders = relevantOrders.filter(o => o.dateAdd === today)
  const todayData = todayOrders.length > 0
    ? { count: todayOrders.length, total: todayOrders.reduce((s, o) => s + parseFloat(o.totalTTC || 0), 0), orders: todayOrders }
    : null

  // Groupement "par jour" : tous les items pertinents groupés par leur date réelle
  const ordersByDay = {}
  relevantOrders.forEach((o) => {
    const day = o.dateAdd && o.dateAdd !== '—' ? o.dateAdd : null
    if (!day) return
    if (!ordersByDay[day]) ordersByDay[day] = { count: 0, total: 0, products: 0, orders: [] }
    ordersByDay[day].count    += 1
    ordersByDay[day].total    += parseFloat(o.totalTTC || 0)
    ordersByDay[day].products += parseInt(o.productCount || 0)
    ordersByDay[day].orders.push(o)
  })

  const days = Object.entries(ordersByDay).sort((a, b) => new Date(b[0]) - new Date(a[0]))

  // Commandes de la date recherchée
  const searchData = searchDate ? ordersByDay[searchDate] : null

  return (
    <div className="dashboard">

      {/* 4 badges */}
      <div className="stats-grid">
        <div className="stat-card stat-blue" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Produits</span>
            <div className="stat-icon"><i className="ti ti-box"></i></div>
          </div>
          <div className="stat-value">{loading ? '…' : stats.totalProducts}</div>
          <div className="stat-sub">{loading ? '' : `${stats.activeProducts} actifs`}</div>
        </div>

        <div className="stat-card stat-green" onClick={() => navigate('/customers')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Clients</span>
            <div className="stat-icon"><i className="ti ti-users"></i></div>
          </div>
          <div className="stat-value">{loading ? '…' : stats.totalCustomers}</div>
          <div className="stat-sub">{loading ? '' : `${stats.activeCustomers} actifs`}</div>
        </div>

        <div className="stat-card stat-amber" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Commandes</span>
            <div className="stat-icon"><i className="ti ti-clipboard-list"></i></div>
          </div>
          <div className="stat-value">{loading ? '…' : stats.totalOrders}</div>
          <div className="stat-sub">{loading ? '' : `${stats.totalRevenue} Ar`}</div>
        </div>

        <div className="stat-card stat-red" onClick={() => navigate('/stock')} style={{ cursor: 'pointer' }}>
          <div className="stat-card-top">
            <span className="stat-label">Ruptures</span>
            <div className="stat-icon"><i className="ti ti-package"></i></div>
          </div>
          <div className="stat-value">{loading ? '…' : stats.outOfStock}</div>
          <div className="stat-sub">{loading ? '' : `${stats.lowStock} stock faible`}</div>
        </div>
      </div>

      {/* Row principale : aujourd'hui + total par jour */}
      <div className="dashboard-row">

        {/* Card aujourd'hui */}
        <div className="dash-card today-card">
          <div className="today-header">
            <div>
              <p className="today-label">Aujourd'hui</p>
              <p className="today-date">{today}</p>
            </div>
            <div className="today-icon">
              <i className="ti ti-calendar-event"></i>
            </div>
          </div>

          {loading ? (
            <p className="dash-empty">Chargement...</p>
          ) : !todayData ? (
            <p className="dash-empty">Aucune commande aujourd'hui</p>
          ) : (
            <>
              <div className="today-stats">
                <div className="today-stat">
                  <span className="today-stat-val">{todayData.count}</span>
                  <span className="today-stat-lbl">commandes</span>
                </div>
                <div className="today-stat-divider"></div>
                <div className="today-stat">
                  <span className="today-stat-val">{todayData.total.toFixed(2)}</span>
                  <span className="today-stat-lbl">€ TTC</span>
                </div>
              </div>

              <table className="dash-mini-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Réf.</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {todayData.orders.map(o => (
                    <tr key={o.id}>
                      <td><strong>{o.reference}</strong></td>
                      <td>{o.customer}</td>
                      <td className="price">{o.totalTTC} €</td>
                      <td>
                        <span className="order-state-badge" style={{
                          background: `${o.stateColor}22`,
                          color: o.stateColor,
                          border: `0.5px solid ${o.stateColor}55`
                        }}>
                          {o.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Card total général par jour */}
        <div className="dash-card">
          <div className="dash-card-header">
            <p className="dash-card-title">
              <i className="ti ti-chart-bar"></i>
              Par jour
            </p>
            <button className="dash-card-link" onClick={() => navigate('/orders')}>Voir tout →</button>
          </div>

          {loading ? (
            <p className="dash-empty">Chargement...</p>
          ) : days.length === 0 ? (
            <p className="dash-empty">Aucune commande</p>
          ) : (
            <table className="dash-mini-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Cmd</th>
                  <th>Qté</th>
                  <th>États</th>
                  <th>Montant TTC</th>
                </tr>
              </thead>
              <tbody>
                {days.map(([day, data]) => {
                  // Grouper les états de la journée en badges condensés
                  const stateCounts = {}
                  data.orders.forEach(o => {
                    const key = o.state
                    if (!stateCounts[key]) stateCounts[key] = { count: 0, color: o.stateColor }
                    stateCounts[key].count++
                  })
                  return (
                    <tr key={day} className={day === today ? 'row-today' : ''}>
                      <td>
                        {day === today
                          ? <span className="today-pill">Aujourd'hui</span>
                          : day}
                      </td>
                      <td><span className="count-badge">{data.count}</span></td>
                      <td><span className="count-badge">{data.products}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {Object.entries(stateCounts).map(([state, { count, color }]) => (
                            <span
                              key={state}
                              className="order-state-badge"
                              style={{
                                background: `${color}22`,
                                color,
                                border: `0.5px solid ${color}55`,
                                fontSize: '0.72rem',
                                padding: '1px 6px',
                              }}
                            >
                              {count > 1 ? `${count}× ` : ''}{state}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="price">{data.total.toFixed(2)} €</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>Total général</strong></td>
                  <td><strong>{stats.totalOrders}</strong></td>
                  <td><strong>{relevantOrders.reduce((s, o) => s + parseInt(o.productCount || 0), 0)}</strong></td>
                  <td></td>
                  <td className="price"><strong>{stats.totalRevenue} €</strong></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Card recherche par date */}
      <div className="dash-card">
        <div className="dash-card-header">
          <p className="dash-card-title">
            <i className="ti ti-search"></i>
            Commandes par date
          </p>
        </div>

        <div className="date-search-bar">
          <i className="ti ti-calendar"></i>
          <input
            type="date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            className="date-input"
          />
          {searchDate && (
            <button className="date-clear" onClick={() => setSearchDate('')}>
              <i className="ti ti-x"></i>
            </button>
          )}
        </div>

        {searchDate && (
          !searchData ? (
            <p className="dash-empty">Aucune commande le {searchDate}</p>
          ) : (
            <>
              <div className="search-result-summary">
                <span className="count-badge">{searchData.count} commande{searchData.count > 1 ? 's' : ''}</span>
                <span className="search-total">{searchData.total.toFixed(2)} € TTC</span>
              </div>
              <table className="dash-mini-table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Réf.</th>
                    <th>Client</th>
                    <th>Transporteur</th>
                    <th>Montant HT</th>
                    <th>Montant TTC</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {searchData.orders.map(o => (
                    <tr key={o.id}>
                      <td><strong>{o.reference}</strong></td>
                      <td>{o.customer}</td>
                      <td className="muted">{o.carrier}</td>
                      <td className="price">{o.totalHT} €</td>
                      <td className="price">{o.totalTTC} €</td>
                      <td>
                        <span className="order-state-badge" style={{
                          background: `${o.stateColor}22`,
                          color: o.stateColor,
                          border: `0.5px solid ${o.stateColor}55`
                        }}>
                          {o.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}

        {!searchDate && (
          <p className="dash-empty" style={{ paddingTop: 8 }}>Sélectionnez une date pour voir le détail</p>
        )}
      </div>

    </div>
  )
}

export default Dashboard