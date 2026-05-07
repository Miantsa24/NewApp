import { useEffect, useState } from 'react'
import { getAllCombinations, getCombinationById } from '../api/services/combinationsService'
import './List.css'

// Extrait la valeur d'un champ qui peut être un objet xlink ou une valeur simple
const getVal = (field) => {
  if (field === null || field === undefined) return '—'
  if (typeof field === 'object') {
    if (field['#text'] !== undefined) return field['#text']
    return '—'
  }
  return field
}

const CombinationsList = () => {
  const [combinations, setCombinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCombinations = async () => {
      try {
        const data = await getAllCombinations()
        const list = data?.prestashop?.combinations?.combination

        if (!list) { setCombinations([]); return }

        const arr = Array.isArray(list) ? list : [list]
        const details = await Promise.all(
          arr.map(async (combo) => {
            const detail = await getCombinationById(combo['@_id'])
            return detail?.prestashop?.combination
          })
        )
        setCombinations(details.filter(Boolean))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCombinations()
  }, [])

  if (loading) return <div className="loading">Chargement des déclinaisons...</div>
  if (error) return <div className="error">{error}</div>

  if (combinations.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-adjustments" aria-hidden="true"></i>
      <p>Aucune déclinaison détectée</p>
      <span>Importez des déclinaisons via la page Import CSV</span>
    </div>
  )

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Déclinaisons</h1>
        <span className="badge">{combinations.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Produit ID</th>
            <th>Référence</th>
            <th>Prix impact</th>
          </tr>
        </thead>
        <tbody>
          {combinations.map((combo) => (
            <tr key={combo?.id}>
              <td className="id-cell">#{getVal(combo?.id)}</td>
              <td>#{getVal(combo?.id_product)}</td>
              <td>{getVal(combo?.reference)}</td>
              <td className="price-cell">
                {combo?.price ? `${parseFloat(getVal(combo.price)).toFixed(2)} €` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CombinationsList