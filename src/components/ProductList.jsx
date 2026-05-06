import { useEffect, useState } from 'react'
import { getAllProducts, getProductById } from '../api/services/productService'

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
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h1>Produits PrestaShop</h1>
      <ul>
        {products.map((product) => (
          <li key={product['@_id'] || product?.id}>
            <strong>{product?.name?.language?.['#text']}</strong>
            {' - '}
            {product?.price} €
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProductList