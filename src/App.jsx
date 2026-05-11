import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
// import ProductList from './components/ProductList'
// import CategoriesList from './components/CategoriesList'
// import CombinationsList from './components/CombinationsList'
// import StockList from './components/StockList'
// import CustomersList from './components/CustomersList'
import OrdersList from './components/OrdersList'
import ImportPage from './pages/ImportPage'
import ResetPage from './pages/ResetPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"             element={<Dashboard />} />
                {/* <Route path="/products"     element={<ProductList />} />
                <Route path="/categories"   element={<CategoriesList />} /> */}
                {/* <Route path="/combinations" element={<CombinationsList />} />
                <Route path="/stock"        element={<StockList />} /> */}
                {/* <Route path="/customers"    element={<CustomersList />} /> */}
                <Route path="/orders"       element={<OrdersList />} />
                <Route path="/import"       element={<ImportPage />} />
                <Route path="/reset"        element={<ResetPage />} />
                <Route path="*"             element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  )
}

export default App