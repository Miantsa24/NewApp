import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProductList from './components/ProductList'
import CustomersList from './components/CustomersList'
import OrdersList from './components/OrdersList'
import ResetPage from './pages/ResetPage'
// import StocksList from './components/StocksList'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/products" />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/customers" element={<CustomersList />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/reset" element={<ResetPage />} />
          {/* <Route path="/stocks" element={<StocksList />} /> */}
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App