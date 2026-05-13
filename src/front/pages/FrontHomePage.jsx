import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FrontLayout from '../FrontLayout'
import axiosInstance from '../../api/axiosInstance'
import { parseXML } from '../../api/xmlParser'
import { frontIsAuthenticated, frontGetCurrentUser } from '../services/frontAuthService'
import './FrontHomePage.css'

const toArray = (data) => {
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

const getVal = (field) => {
  if (field === null || field === undefined) return ''
  if (typeof field === 'object' && field['#text'] !== undefined) return field['#text']
  return field
}

const FrontHomePage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const navigate  = useNavigate()
  const isLoggedIn = frontIsAuthenticated()
  const currentUser = frontGetCurrentUser()

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get('/customers?display=full')
        const data = parseXML(response.data)
        const raw = toArray(data?.prestashop?.customers?.customer)
        const list = raw
          .filter(c => getVal(c.active) == 1)
          .map(c => ({
            id:        getVal(c.id),
            firstname: getVal(c.firstname) || '—',
            lastname:  getVal(c.lastname)  || '—',
            email:     getVal(c.email)     || '—',
            dateAdd:   getVal(c.date_add)?.split(' ')[0] || '—',
          }))
        setCustomers(list)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const handleAccess = (customer) => {
    if (isLoggedIn && currentUser?.email === customer.email) {
      // Déjà connecté avec ce compte → aller directement au shop
      navigate('/shop/products')
      return
    }
    // Rediriger vers login avec email pré-rempli
    navigate(`/shop/login?email=${encodeURIComponent(customer.email)}`)
  }

  return (
    <FrontLayout>
      <div className="home-header">
        <h2 className="home-section-title">Comptes disponibles</h2>
        <p className="home-section-sub">
          {isLoggedIn
            ? `Connecté en tant que ${currentUser?.firstname} ${currentUser?.lastname}`
            : 'Sélectionnez votre compte pour vous connecter'}
        </p>
      </div>

      {loading && <p className="home-status">Chargement des utilisateurs...</p>}
      {error   && <p className="home-status home-error">Erreur : {error}</p>}
      {!loading && !error && customers.length === 0 && (
        <p className="home-status">Aucun utilisateur trouvé.</p>
      )}

      {!loading && !error && customers.length > 0 && (
        <div className="home-grid">
          {customers.map(c => {
            const isCurrentUser = isLoggedIn && currentUser?.email === c.email
            return (
              <div
                className={`home-card ${isCurrentUser ? 'home-card-active' : ''}`}
                key={c.id}
              >
                <div className={`home-card-avatar ${isCurrentUser ? 'home-card-avatar-active' : ''}`}>
                  {c.firstname.charAt(0).toUpperCase()}{c.lastname.charAt(0).toUpperCase()}
                </div>
                <div className="home-card-info">
                  <p className="home-card-name">
                    {c.firstname} {c.lastname}
                    {isCurrentUser && (
                      <span className="home-card-connected-badge">
                        <i className="ti ti-circle-check"></i> Connecté
                      </span>
                    )}
                  </p>
                  <p className="home-card-email">{c.email}</p>
                  <p className="home-card-date">Inscrit le {c.dateAdd}</p>
                </div>
                <button
                  className={`home-card-btn ${isCurrentUser ? 'home-card-btn-active' : ''}`}
                  onClick={() => handleAccess(c)}
                >
                  {isCurrentUser ? 'Continuer →' : 'Accéder'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </FrontLayout>
  )
}

export default FrontHomePage