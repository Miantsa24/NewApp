import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FrontLayout from '../FrontLayout'
import { frontGetCurrentUser } from '../services/frontAuthService'
import { checkStockForItems, createReorder } from '../services/orderService'
import './ReorderConfirmPage.css'

const ReorderConfirmPage = () => {
  const navigate  = useNavigate()
  const { state } = useLocation()
  const user      = frontGetCurrentUser()

  const { items = [], multiplier = 1, reference = '—' } = state || {}

  // Articles avec quantités multipliées
  const newItems = items.map(item => ({ ...item, qty: item.qty * multiplier }))

  const [stockCheck, setStockCheck] = useState(null)
  const [checking,   setChecking]   = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    if (!state || newItems.length === 0) return
    const run = async () => {
      setChecking(true)
      try {
        const results = await checkStockForItems(newItems)
        setStockCheck(results)
      } catch (err) {
        setError(`Erreur vérification stock : ${err.message}`)
      } finally {
        setChecking(false)
      }
    }
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state || items.length === 0) {
    return (
      <FrontLayout>
        <div className="reorder-empty">
          <i className="ti ti-clipboard-off"></i>
          <p>Aucune commande à dupliquer.</p>
          <button onClick={() => navigate('/shop/my-orders')}>Mes commandes</button>
        </div>
      </FrontLayout>
    )
  }

  const allSufficient = stockCheck !== null && stockCheck.every(r => r.sufficient)
  const totalTTC = newItems.reduce((s, i) => s + (i.unitPriceTTC || 0) * i.qty, 0)

  const handleConfirm = async () => {
    if (!user) { setError('Vous devez être connecté.'); return }
    setConfirming(true)
    setError(null)
    try {
      const result = await createReorder({ customerId: user.id, items: newItems })
      navigate(`/shop/order-confirm/${result.orderId}`, {
        state: {
          reference: result.reference,
          totalTTC:  result.totalTTC,
          state:     'Livrée',
        },
      })
    } catch (err) {
      setError(`Erreur : ${err.message}`)
      setConfirming(false)
    }
  }

  return (
    <FrontLayout>
      <div className="reorder-wrapper">

        <div className="reorder-header">
          <button className="reorder-back" onClick={() => navigate('/shop/my-orders')}>
            <i className="ti ti-arrow-left"></i>
          </button>
          <div>
            <h1 className="reorder-title">Confirmer la nouvelle commande</h1>
            <p className="reorder-subtitle">
              Commande originale <strong>{reference}</strong> × <strong>{multiplier}</strong>
            </p>
          </div>
        </div>

        <div className="reorder-card">
          <table className="reorder-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th className="center">Qté orig.</th>
                <th className="center">Multiplicateur</th>
                <th className="center">Nouvelle qté</th>
                <th className="center">Stock dispo</th>
                <th className="center">Prix unit. TTC</th>
              </tr>
            </thead>
            <tbody>
              {newItems.map((item, idx) => {
                const check = stockCheck?.[idx]
                return (
                  <tr key={idx} className={check?.sufficient === false ? 'reorder-row-error' : ''}>
                    <td>
                      <span className="reorder-product-name">{item.name}</span>
                      {item.attributeLabel && (
                        <span className="reorder-attr">{item.attributeLabel}</span>
                      )}
                    </td>
                    <td className="center">{items[idx].qty}</td>
                    <td className="reorder-mult-cell">×{multiplier}</td>
                    <td className="reorder-newqty">{item.qty}</td>
                    <td className="center">
                      {checking ? (
                        <i className="ti ti-loader-2 spin"></i>
                      ) : check != null ? (
                        <span className={`reorder-stock-badge ${check.sufficient ? 'ok' : 'ko'}`}>
                          {check.available}
                          {!check.sufficient && <i className="ti ti-alert-circle"></i>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="center">
                      {item.unitPriceTTC > 0 ? `${item.unitPriceTTC.toFixed(2)} €` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {stockCheck && !allSufficient && (
          <div className="reorder-stock-warn">
            <i className="ti ti-alert-triangle"></i>
            Stock insuffisant pour un ou plusieurs produits.
            Réduisez le multiplicateur ou attendez un réapprovisionnement.
          </div>
        )}

        {error && (
          <div className="reorder-err">
            <i className="ti ti-alert-circle"></i>
            {error}
          </div>
        )}

        <div className="reorder-footer">
          <div className="reorder-total">
            Total TTC estimé : <strong>{totalTTC.toFixed(2)} €</strong>
          </div>
          <button
            className="reorder-btn-confirm"
            disabled={!allSufficient || confirming || checking}
            onClick={handleConfirm}
          >
            {confirming ? (
              <><i className="ti ti-loader-2 spin"></i> En cours...</>
            ) : (
              <><i className="ti ti-check"></i> Confirmer la commande</>
            )}
          </button>
        </div>

      </div>
    </FrontLayout>
  )
}

export default ReorderConfirmPage
