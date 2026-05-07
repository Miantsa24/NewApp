import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProductList from './components/ProductList'
import CustomersList from './components/CustomersList'
import OrdersList from './components/OrdersList'
import ImportPage from './pages/ImportPage'
import ResetPage from './pages/ResetPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/customers" element={<CustomersList />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App