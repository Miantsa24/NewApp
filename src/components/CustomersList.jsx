import { useEffect, useState } from 'react'
import { getAllCustomers, getCustomerById } from '../api/services/customersService'
import './List.css'

const CustomersList = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getAllCustomers()
        const customerList = data?.prestashop?.customers?.customer

        // Aucun client trouvé
        if (!customerList) {
          setCustomers([])
          return
        }

        const customersArray = Array.isArray(customerList) ? customerList : [customerList]

        const customersDetails = await Promise.all(
          customersArray.map(async (customer) => {
            const detail = await getCustomerById(customer['@_id'])
            return detail?.prestashop?.customer
          })
        )

        // Filtrer les résultats undefined
        setCustomers(customersDetails.filter(Boolean))
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  if (loading) return <div className="loading">Chargement des clients...</div>
  if (error) return <div className="error">{error}</div>

  if (customers.length === 0) return (
    <div className="empty-state">
      <i className="ti ti-users" aria-hidden="true"></i>
      <p>Aucun client détecté</p>
      <span>Importez des clients via la page Import CSV</span>
    </div>
  )

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Clients</h1>
        <span className="badge">{customers.length}</span>
      </div>
      <table className="list-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Email</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer['@_id'] || customer?.id}>
              <td className="id-cell">#{customer?.id}</td>
              <td className="name-cell">
                <div className="avatar">
                  {customer?.firstname?.[0]}{customer?.lastname?.[0]}
                </div>
                {customer?.firstname} {customer?.lastname}
              </td>
              <td>{customer?.email}</td>
              <td>
                <span className={`status ${customer?.active == 1 ? 'status-active' : 'status-inactive'}`}>
                  {customer?.active == 1 ? 'Actif' : 'Inactif'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CustomersList