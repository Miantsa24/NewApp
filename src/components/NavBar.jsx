import { NavLink } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        🛒 NewApp
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>
            📦 Produits
          </NavLink>
        </li>
        <li>
          <NavLink to="/customers" className={({ isActive }) => isActive ? 'active' : ''}>
            👤 Clients
          </NavLink>
        </li>
        <li>
          <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>
            📋 Commandes
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar