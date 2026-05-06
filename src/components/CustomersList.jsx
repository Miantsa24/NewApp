import { useEffect, useState } from 'react'
import { getAllCustomers, getCustomerById } from '../api/services/customersService'

const CustomersList = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getAllCustomers()
        const customerList = data?.prestashop?.customers?.customer
        const customersArray = Array.isArray(customerList) ? customerList : [customerList]

        const customersDetails = await Promise.all(
          customersArray.map(async (customer) => {
            const detail = await getCustomerById(customer['@_id'])
            return detail?.prestashop?.customer
          })
        )

        setCustomers(customersDetails)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  if (loading) return <p>Chargement...</p>
  if (error) return <p style={{ color: 'red' }}>{error}</p>

  return (
    <div>
      <h1>Customers</h1>
      <ul>
        {customers.map((customer) => (
          <li key={customer['@_id'] || customer?.id}>
            <strong>{customer?.firstname} {customer?.lastname}</strong>
            {' - '}
            {customer?.email}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CustomersList