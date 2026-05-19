import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProductList from './components/ProductList'
import StockEntryPage from './pages/StockEntryPage'
import StockHistoryPage from './pages/StockHistoryPage'
import OrdersList from './components/OrdersList'
import ImportPage from './pages/ImportPage'
import ResetPage from './pages/ResetPage'
import ShopPage from './front/pages/ShopPage'
import ProductPage from './front/pages/ProductPage'
import CartPage from './front/pages/CartPage'
import FrontLoginPage from './front/pages/FrontLoginPage'
import FrontHomePage from './front/pages/FrontHomePage'
import OrderConfirmPage from './front/pages/OrderConfirmPage'
import MyOrdersPage from './front/pages/MyOrdersPage'
import ReorderConfirmPage from './front/pages/ReorderConfirmPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes FrontOffice — publiques */}
        <Route path="/shop"                        element={<FrontHomePage />} />
        <Route path="/shop/products"               element={<ShopPage />} />
        <Route path="/shop/product/:id"            element={<ProductPage />} />
        <Route path="/shop/cart"                   element={<CartPage />} />
        <Route path="/shop/login"                  element={<FrontLoginPage />} />
        <Route path="/shop/order-confirm/:id"      element={<OrderConfirmPage />} />
        <Route path="/shop/my-orders"              element={<MyOrdersPage />} />
        <Route path="/shop/reorder-confirm"        element={<ReorderConfirmPage />} />

        {/* Routes protégées */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"             element={<Dashboard />} />
                <Route path="/products"     element={<ProductList />} />
                <Route path="/stock"        element={<StockEntryPage />} />
                <Route path="/stock/history/:productId"                element={<StockHistoryPage />} />
                <Route path="/stock/history/:productId/:combinationId" element={<StockHistoryPage />} />
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
