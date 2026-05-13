import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { frontLogout, frontGetCurrentUser, getCartKey } from './services/frontAuthService'
import './FrontLayout.css'

const FrontLayout = ({ children }) => {
  const [cartCount, setCartCount] = useState(0)
  const [user, setUser]           = useState(null)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const syncCart = () => {
      const currentUser = frontGetCurrentUser()
      if (!currentUser) {
        setCartCount(0)
        return
      }
      const key  = `front_cart_${currentUser.id}`
      const cart = JSON.parse(localStorage.getItem(key) || '[]')
      setCartCount(cart.reduce((sum, item) => sum + item.qty, 0))
    }
    syncCart()
    window.addEventListener('storage', syncCart)
    return () => window.removeEventListener('storage', syncCart)
  }, [])

  useEffect(() => {
    setUser(frontGetCurrentUser())
  }, [])

  const handleLogout = () => {
    frontLogout()
    setUser(null)
    setCartCount(0)
    navigate('/shop')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="front-layout">
      <nav className="front-nav">
        <div className="front-nav-left">
          <Link to="/shop" className="front-nav-logo">NewApp Shop</Link>
          <div className="front-nav-links">
            <Link
              to="/shop/products"
              className={`front-nav-link ${isActive('/shop/products') ? 'active' : ''}`}
            >
              <i className="ti ti-box"></i>
              Produits
            </Link>
            <Link
              to="/shop"
              className={`front-nav-link ${isActive('/shop') ? 'active' : ''}`}
            >
              <i className="ti ti-users"></i>
              Utilisateurs
            </Link>
          </div>
        </div>

        <div className="front-nav-actions">
          <Link to="/shop/cart" className="front-nav-cart">
            <i className="ti ti-shopping-cart"></i>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          {user ? (
            <div className="front-nav-user">
              <div className="front-nav-avatar">
                {user.firstname?.charAt(0).toUpperCase()}
              </div>
              <span className="front-nav-username">{user.firstname}</span>
              <button onClick={handleLogout} className="front-nav-logout">
                <i className="ti ti-logout"></i>
              </button>
            </div>
          ) : (
            <Link to="/shop/login" className="front-nav-login">Connexion</Link>
          )}
        </div>
      </nav>
      <main className="front-main">{children}</main>
    </div>
  )
}

export default FrontLayout