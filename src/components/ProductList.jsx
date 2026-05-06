import { useEffect, useState } from 'react'
import { getAllProducts, getProductById } from '../api/services/productService'
import './List.css'

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts()
        const productList = data?.prestashop?.products?.product
        const productsArray = Array.isArray(productList) ? productList : [productList]
        const productsDetails = await Promise.all(
          productsArray.map(async (product) => {
            const detail = await getProductById(product['@_id'])
            return detail?.prestashop?.product
          })
        )
        setProducts(productsDetails)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  if (loading) return <div className="loading">Chargement des produits...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Produits</h1>
        <span className="badge">{products.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Prix</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product['@_id'] || product?.id}>
              <td className="id-cell">#{product?.id}</td>
              <td className="name-cell">{product?.name?.language?.['#text'] || '—'}</td>
              <td className="price-cell">{parseFloat(product?.price).toFixed(2)} €</td>
              <td>
                <span className={`status ${product?.active == 1 ? 'status-active' : 'status-inactive'}`}>
                  {product?.active == 1 ? 'Actif' : 'Inactif'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ProductList