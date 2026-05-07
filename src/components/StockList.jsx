import { useEffect, useState } from 'react'
import { getAllStock, getStockById } from '../api/services/stockService'
import './List.css'

const getVal = (field) => {
  if (field === null || field === undefined) return '—'
  if (typeof field === 'object') {
    if (field['#text'] !== undefined) return field['#text']
    return '—'
  }
  return field
}

const StockList = () => {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const data = await getAllStock()
        const list = data?.prestashop?.stock_availables?.stock_available

        if (!list) { setStock([]); return }

        const arr = Array.isArray(list) ? list : [list]
        const details = await Promise.all(
          arr.map(async (s) => {
            const detail = await getStockById(s['@_id'])
            return detail?.prestashop?.stock_available
          })
        )
        setStock(details.filter(Boolean))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStock()
  }, [])

  if (loading) return <div className="loading">Chargement du stock...</div>
  if (error) return <div className="error">{error}</div>

  if (stock.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-package" aria-hidden="true"></i>
      <p>Aucun stock détecté</p>
      <span>Importez du stock via la page Import CSV</span>
    </div>
  )

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Stock</h1>
        <span className="badge">{stock.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Produit ID</th>
            <th>Quantité</th>
            <th>Dépend du stock</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr key={getVal(s?.id)}>
              <td className="id-cell">#{getVal(s?.id)}</td>
              <td>#{getVal(s?.id_product)}</td>
              <td>
                <span className={`status ${getVal(s?.quantity) > 0 ? 'status-active' : 'status-inactive'}`}>
                  {getVal(s?.quantity)}
                </span>
              </td>
              <td className="date-cell">
                {getVal(s?.depends_on_stock) == 1 ? 'Oui' : 'Non'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StockList