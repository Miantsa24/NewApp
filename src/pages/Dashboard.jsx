import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useEnrichedOrders from '../hooks/useEnrichedOrders'
import useEnrichedStock from '../hooks/useEnrichedStock'
import { ORDER_STATES } from '../api/services/ordersService'
import './Dashboard.css'

const today = new Date().toISOString().split('T')[0]

const Dashboard = () => {
  const navigate = useNavigate()
  const [searchDate, setSearchDate] = useState('')

  const { orders, loading: loadingO } = useEnrichedOrders()
  const { stock,  loading: loadingS } = useEnrichedStock()

  const loading = loadingO || loadingS

  const stats = {
    outOfStock: stock.filter(s => s.outOfStock).length,
    lowStock:   stock.filter(s => s.lowStock).length,
  }

  // ── Filtres états ──────────────────────────────────────────────────────────
  const isPaiementAccepte = (o) => o.stateId === ORDER_STATES.PAYMENT_ACCEPTED
  const isDansPanier      = (o) =>
    o.stateId === ORDER_STATES.IN_CART || o.type === 'cart' || (o.state || '').toLowerCase() === 'dans le panier'
  const isDelivered       = (o) => o.stateId === ORDER_STATES.DELIVERED

  const paOrders       = orders.filter(isPaiementAccepte)
  const panierOrders   = orders.filter(isDansPanier)
  const livraisonOrders = orders.filter(isDelivered)

  const sum = (arr, field) => arr.reduce((s, o) => s + parseFloat(o[field] || 0), 0)

  const pa = {
    ttc:   sum(paOrders, 'totalTTC').toFixed(2),
    ht:    sum(paOrders, 'totalHT').toFixed(2),
    count: paOrders.length,
  }
  const panier = {
    ttc:   sum(panierOrders, 'totalTTC').toFixed(2),
    ht:    sum(panierOrders, 'totalHT').toFixed(2),
    count: panierOrders.length,
  }
  const livraison = {
    ttc:   sum(livraisonOrders, 'totalTTC').toFixed(2),
    ht:    sum(livraisonOrders, 'totalHT').toFixed(2),
    count: livraisonOrders.length,
  }
  const total = {
    ttc:   (parseFloat(pa.ttc) + parseFloat(panier.ttc) + parseFloat(livraison.ttc)).toFixed(2),
    ht:    (parseFloat(pa.ht)  + parseFloat(panier.ht)  + parseFloat(livraison.ht)).toFixed(2),
    count: pa.count + panier.count + livraison.count,
  }

  // États pertinents pour "par jour" et recherche (inclut livré)
  const relevantOrders = orders.filter(o => isPaiementAccepte(o) || isDansPanier(o) || isDelivered(o))

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

      {/* 4 colonnes financières */}
      <div className="finance-grid finance-grid-4">

        {/* Colonne 1 — Paiement accepté */}
        <div className="finance-col finance-col-green">
          <p className="finance-col-title">
            <i className="ti ti-circle-check"></i>
            Commandes payées
          </p>
          <div className="finance-cards">
            <div className="finance-card">
              <span className="finance-label">Total TTC</span>
              <span className="finance-value">{loading ? '…' : `${pa.ttc} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Total HT</span>
              <span className="finance-value">{loading ? '…' : `${pa.ht} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Nb commandes</span>
              <span className="finance-value finance-count">{loading ? '…' : pa.count}</span>
            </div>
          </div>
        </div>

        {/* Colonne 2 — Dans le panier */}
        <div className="finance-col finance-col-amber">
          <p className="finance-col-title">
            <i className="ti ti-shopping-cart"></i>
            Paniers en cours
          </p>
          <div className="finance-cards">
            <div className="finance-card">
              <span className="finance-label">Total TTC</span>
              <span className="finance-value">{loading ? '…' : `${panier.ttc} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Total HT</span>
              <span className="finance-value">{loading ? '…' : `${panier.ht} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Nb paniers</span>
              <span className="finance-value finance-count">{loading ? '…' : panier.count}</span>
            </div>
          </div>
        </div>

        {/* Colonne 3 — Livré */}
        <div className="finance-col finance-col-indigo">
          <p className="finance-col-title">
            <i className="ti ti-truck-delivery"></i>
            Livré
          </p>
          <div className="finance-cards">
            <div className="finance-card">
              <span className="finance-label">Total TTC</span>
              <span className="finance-value">{loading ? '…' : `${livraison.ttc} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Total HT</span>
              <span className="finance-value">{loading ? '…' : `${livraison.ht} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Nb livré</span>
              <span className="finance-value finance-count">{loading ? '…' : livraison.count}</span>
            </div>
          </div>
        </div>

        {/* Colonne 4 — Total général */}
        <div className="finance-col finance-col-blue">
          <p className="finance-col-title">
            <i className="ti ti-chart-bar"></i>
            Total général
          </p>
          <div className="finance-cards">
            <div className="finance-card">
              <span className="finance-label">Total TTC</span>
              <span className="finance-value">{loading ? '…' : `${total.ttc} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Total HT</span>
              <span className="finance-value">{loading ? '…' : `${total.ht} €`}</span>
            </div>
            <div className="finance-card">
              <span className="finance-label">Nb total</span>
              <span className="finance-value finance-count">{loading ? '…' : total.count}</span>
            </div>
          </div>
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
                    <th>Modifié le</th>
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
                      <td className="muted">{o.dateUpd || '—'}</td>
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
                  <th>Dern. modif.</th>
                </tr>
              </thead>
              <tbody>
                {days.map(([day, data]) => {
                  const stateCounts = {}
                  data.orders.forEach(o => {
                    const key = o.state
                    if (!stateCounts[key]) stateCounts[key] = { count: 0, color: o.stateColor }
                    stateCounts[key].count++
                  })
                  // Date de modification la plus récente parmi les commandes du jour
                  const lastModif = data.orders
                    .map(o => o.dateUpd || '')
                    .filter(Boolean)
                    .sort()
                    .at(-1) || '—'
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
                      <td className="muted">{lastModif}</td>
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
                  <td></td>
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
                    <th>Modifié le</th>
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
                      <td className="muted">{o.dateUpd || '—'}</td>
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