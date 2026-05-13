import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FrontLayout from '../FrontLayout'
import { frontIsAuthenticated, getCartKey, frontGetCurrentUser } from '../services/frontAuthService'
import {
  getCustomerAddresses,
  getClickAndCollectCarrier,
  getDefaultCurrency,
  createAddress,
  createOrder,
} from '../services/orderService'
import './CartPage.css'

const CartPage = () => {
  const [cart, setCart]               = useState([])
  const [showModal, setShowModal]     = useState(false)
  const [addresses, setAddresses]     = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({ alias: '', address1: '', city: '', phone: '' })
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [loadingModal, setLoadingModal] = useState(false)
  const navigate = useNavigate()
  const user = frontGetCurrentUser()

  useEffect(() => {
    const cartKey = getCartKey()
    if (!cartKey) { setCart([]); return }
    setCart(JSON.parse(localStorage.getItem(cartKey) || '[]'))
  }, [])

  const persist = (updated) => {
    const cartKey = getCartKey()
    if (!cartKey) return
    localStorage.setItem(cartKey, JSON.stringify(updated))
    window.dispatchEvent(new Event('storage'))
  }

  const updateQty = (itemId, delta) => {
    const updated = cart.map(item => {
      if (item.itemId !== itemId) return item
      const newQty = item.qty + delta
      if (newQty <= 0) return null
      return { ...item, qty: newQty }
    }).filter(Boolean)
    setCart(updated)
    persist(updated)
  }

  const removeItem = (itemId) => {
    const updated = cart.filter(i => i.itemId !== itemId)
    setCart(updated)
    persist(updated)
  }

  const total    = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0)
  const totalHT  = (total / 1.20).toFixed(2)
  const totalTTC = total.toFixed(2)

  // Ouvrir la modale — charger les adresses
  const handleOpenModal = async () => {
    setLoadingModal(true)
    setSubmitError(null)
    setShowAddressForm(false)
    try {
      const addrs = await getCustomerAddresses(user.id)
      setAddresses(addrs)
      setSelectedAddress(addrs.length > 0 ? addrs[0] : null)
      if (addrs.length === 0) setShowAddressForm(true)
    } catch (e) {
      setSubmitError('Impossible de charger les adresses')
    } finally {
      setLoadingModal(false)
      setShowModal(true)
    }
  }

  const getVal = (field) => {
    if (!field) return ''
    if (typeof field === 'object' && field['#text'] !== undefined) return field['#text']
    return field
  }

  // Créer une adresse puis continuer
  const handleCreateAddress = async () => {
    if (!addressForm.address1 || !addressForm.city) {
      setSubmitError('Adresse et ville sont obligatoires')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const newId = await createAddress(user.id, {
        ...addressForm,
        firstname: user.firstname,
        lastname:  user.lastname,
      })
      // Recharger les adresses
      const addrs = await getCustomerAddresses(user.id)
      setAddresses(addrs)
      const newAddr = addrs.find(a => String(getVal(a.id)) === String(newId)) || addrs[addrs.length - 1]
      setSelectedAddress(newAddr)
      setShowAddressForm(false)
    } catch (e) {
      setSubmitError("Erreur lors de la création de l'adresse : " + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Valider la commande
  const handleConfirmOrder = async () => {
    if (!selectedAddress) {
      setSubmitError('Veuillez sélectionner ou créer une adresse')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const [carrierId, currencyId] = await Promise.all([
        getClickAndCollectCarrier(),
        getDefaultCurrency(),
      ])
      const addressId = String(getVal(selectedAddress.id))
      const { orderId, reference } = await createOrder({
        customerId: user.id,
        addressId,
        carrierId,
        currencyId,
        cart,
        totalHT,
        totalTTC,
      })
      // Vider le panier
      persist([])
      setCart([])
      setShowModal(false)
      navigate(`/shop/order-confirm/${orderId}`, { state: { reference, totalTTC } })
    } catch (e) {
      setSubmitError('Erreur lors de la commande : ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!frontIsAuthenticated()) {
    return (
      <FrontLayout>
        <div className="cart-empty">
          <p>Connectez-vous pour accéder à votre panier.</p>
          <button onClick={() => navigate('/shop')}>Choisir un compte</button>
        </div>
      </FrontLayout>
    )
  }

  return (
    <FrontLayout>
      <h1 className="cart-title">Mon panier</h1>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <p>Votre panier est vide.</p>
          <button onClick={() => navigate('/shop/products')}>Continuer mes achats</button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.itemId} className="cart-item">
                <div className="cart-item-img">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} />
                    : <div className="cart-item-no-img">—</div>}
                </div>
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  {item.attributeLabel && <p className="cart-item-attr">{item.attributeLabel}</p>}
                  <p className="cart-item-price">{item.price} Ar / unité</p>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQty(item.itemId, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.itemId, +1)}>+</button>
                </div>
                <p className="cart-item-subtotal">
                  {(parseFloat(item.price) * item.qty).toFixed(2)} Ar
                </p>
                <button className="cart-item-remove" onClick={() => removeItem(item.itemId)}>
                  <i className="ti ti-x"></i>
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <p className="cart-total">Total : <span>{totalTTC} Ar</span></p>
            <button className="cart-checkout-btn" onClick={handleOpenModal}>
              Commander
            </button>
            <button className="cart-continue" onClick={() => navigate('/shop/products')}>
              Continuer mes achats
            </button>
          </div>
        </div>
      )}

      {/* ── Modale récapitulatif ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <h2 className="modal-title">Récapitulatif de commande</h2>
              <button className="modal-close" onClick={() => !submitting && setShowModal(false)}>
                <i className="ti ti-x"></i>
              </button>
            </div>

            {loadingModal ? (
              <p className="modal-loading">Chargement...</p>
            ) : (
              <>
                {/* Infos client */}
                <div className="modal-section">
                  <p className="modal-section-label">
                    <i className="ti ti-user"></i> Client
                  </p>
                  <p className="modal-info-name">{user.firstname} {user.lastname}</p>
                  <p className="modal-info-email">{user.email}</p>
                </div>

                {/* Adresse */}
                <div className="modal-section">
                  <div className="modal-section-header">
                    <p className="modal-section-label">
                      <i className="ti ti-map-pin"></i> Adresse de livraison
                    </p>
                    {addresses.length > 0 && !showAddressForm && (
                      <button className="modal-link" onClick={() => setShowAddressForm(true)}>
                        + Nouvelle adresse
                      </button>
                    )}
                  </div>

                  {showAddressForm ? (
                    <div className="modal-address-form">
                      <input
                        className="modal-input"
                        placeholder="Alias (ex: Maison)"
                        value={addressForm.alias}
                        onChange={e => setAddressForm(f => ({ ...f, alias: e.target.value }))}
                      />
                      <input
                        className="modal-input"
                        placeholder="Adresse *"
                        value={addressForm.address1}
                        onChange={e => setAddressForm(f => ({ ...f, address1: e.target.value }))}
                      />
                      <input
                        className="modal-input"
                        placeholder="Ville *"
                        value={addressForm.city}
                        onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))}
                      />
                      <input
                        className="modal-input"
                        placeholder="Téléphone"
                        value={addressForm.phone}
                        onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))}
                      />
                      <div className="modal-address-form-actions">
                        <button
                          className="modal-btn-secondary"
                          onClick={() => setShowAddressForm(false)}
                          disabled={submitting}
                        >
                          Annuler
                        </button>
                        <button
                          className="modal-btn-primary"
                          onClick={handleCreateAddress}
                          disabled={submitting}
                        >
                          {submitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  ) : addresses.length === 0 ? (
                    <p className="modal-no-address">Aucune adresse — veuillez en créer une</p>
                  ) : (
                    <div className="modal-address-list">
                      {addresses.map(addr => (
                        <label
                          key={getVal(addr.id)}
                          className={`modal-address-option ${selectedAddress && getVal(selectedAddress.id) === getVal(addr.id) ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress && getVal(selectedAddress.id) === getVal(addr.id)}
                            onChange={() => setSelectedAddress(addr)}
                          />
                          <span>
                            <strong>{getVal(addr.alias)}</strong> — {getVal(addr.address1)}, {getVal(addr.city)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Articles */}
                <div className="modal-section">
                  <p className="modal-section-label">
                    <i className="ti ti-shopping-cart"></i> Articles
                  </p>
                  <div className="modal-items">
                    {cart.map(item => (
                      <div key={item.itemId} className="modal-item">
                        <span className="modal-item-name">
                          {item.name}
                          {item.attributeLabel && <em> — {item.attributeLabel}</em>}
                        </span>
                        <span className="modal-item-qty">× {item.qty}</span>
                        <span className="modal-item-price">
                          {(parseFloat(item.price) * item.qty).toFixed(2)} Ar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Paiement */}
                <div className="modal-section">
                  <p className="modal-section-label">
                    <i className="ti ti-truck"></i> Livraison & Paiement
                  </p>
                  <div className="modal-payment-option selected">
                    <i className="ti ti-circle-check"></i>
                    Paiement à la livraison — Livraison gratuite (Click & Collect)
                  </div>
                </div>

                {/* Total */}
                <div className="modal-total">
                  <span>Total TTC</span>
                  <strong>{totalTTC} Ar</strong>
                </div>

                {submitError && (
                  <p className="modal-error">
                    <i className="ti ti-alert-circle"></i> {submitError}
                  </p>
                )}

                <button
                  className="modal-confirm-btn"
                  onClick={handleConfirmOrder}
                  disabled={submitting || !selectedAddress}
                >
                  {submitting
                    ? <><i className="ti ti-loader-2 spin"></i> Traitement...</>
                    : 'Valider la commande'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </FrontLayout>
  )
}

export default CartPage