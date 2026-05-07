import { useEffect, useState } from 'react'
import { getAllCategories, getCategoryById } from '../api/services/categoriesService'
import './List.css'

const CategoriesList = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllCategories()
        const list = data?.prestashop?.categories?.category

        if (!list) { setCategories([]); return }

        const arr = Array.isArray(list) ? list : [list]
        const details = await Promise.all(
          arr.map(async (cat) => {
            const detail = await getCategoryById(cat['@_id'])
            return detail?.prestashop?.category
          })
        )
        setCategories(details.filter(Boolean))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  if (loading) return <div className="loading">Chargement des catégories...</div>
  if (error) return <div className="error">{error}</div>

  if (categories.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-folder" aria-hidden="true"></i>
      <p>Aucune catégorie détectée</p>
      <span>Importez des catégories via la page Import CSV</span>
    </div>
  )

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Catégories</h1>
        <span className="badge">{categories.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Description</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat?.id}>
              <td className="id-cell">#{cat?.id}</td>
              <td className="name-cell">
                {cat?.name?.language?.['#text'] || cat?.name?.language || '—'}
              </td>
              <td className="date-cell">
                {cat?.description?.language?.['#text']
                  ? String(cat.description.language['#text']).replace(/<[^>]+>/g, '').slice(0, 60) + '...'
                  : '—'
                }
              </td>
              <td>
                <span className={`status ${cat?.active == 1 ? 'status-active' : 'status-inactive'}`}>
                  {cat?.active == 1 ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CategoriesList