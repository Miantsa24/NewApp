import { NavLink, useLocation } from 'react-router-dom'
import './Layout.css'

const NAV_ITEMS = [
  {
    section: 'Catalogue',
    items: [
      { to: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', exact: true },
      { to: '/products', label: 'Produits', icon: 'ti-box' },
      { to: '/customers', label: 'Clients', icon: 'ti-users' },
      { to: '/orders', label: 'Commandes', icon: 'ti-clipboard-list' },
    ]
  },
  {
    section: 'Données',
    items: [
      { to: '/import', label: 'Import CSV', icon: 'ti-upload' },
      { to: '/reset', label: 'Réinitialiser', icon: 'ti-refresh' },
    ]
  }
]

const Layout = ({ children }) => {
  const location = useLocation()

  const getTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard'
    if (path === '/products') return 'Produits'
    if (path === '/customers') return 'Clients'
    if (path === '/orders') return 'Commandes'
    if (path === '/import') return 'Import CSV'
    if (path === '/reset') return 'Réinitialisation'
    return 'NewApp'
  }

  return (
    <div className="layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="ti ti-shopping-cart" aria-hidden="true"></i>
          </div>
          <span className="sidebar-brand-name">New<span>App</span></span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((group) => (
            <div key={group.section} className="nav-group">
              <p className="nav-section">{group.section}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true"></i>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item">
            <i className="ti ti-settings" aria-hidden="true"></i>
            <span>Paramètres</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <h1 className="topbar-title">{getTitle()}</h1>
          <div className="topbar-right">
            <div className="topbar-icon-btn">
              <i className="ti ti-bell" aria-hidden="true"></i>
            </div>
            <div className="topbar-avatar">NA</div>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>

    </div>
  )
}

export default Layout