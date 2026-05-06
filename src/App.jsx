import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProductList from './components/ProductList'
import CustomersList from './components/CustomersList'
import OrdersList from './components/OrdersList'
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
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App