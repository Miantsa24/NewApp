import { useState, useEffect } from 'react'
import axiosInstance from '../api/axiosInstance'
import { parseXML } from '../api/xmlParser'

export const getVal = (field) => {
  if (field === null || field === undefined) return null
  if (typeof field === 'object') {
    if (field['#text'] !== undefined) return field['#text']
    return null
  }
  return field
}

const toArray = (data) => {
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

const fetchAll = async (endpoint, language = 1) => {
  const params = new URLSearchParams({ display: 'full', language })
  const response = await axiosInstance.get(`/${endpoint}?${params}`)
  return parseXML(response.data)
}

/**
 * Hook qui récupère les commandes enrichies avec :
 * - Nom du client
 * - État de la commande (Payé, Expédié, Livré...)
 * - Devise (EUR, USD...)
 * - Transporteur
 * - Nombre de produits dans la commande
 */
const useEnrichedOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEnriched = async () => {
      try {
        setLoading(true)
        setError(null)

        // Étape 1 : Requêtes en parallèle
        const [
          ordersData,
          customersData,
          orderStatesData,
          currenciesData,
          carriersData,
          orderDetailsData,
        ] = await Promise.all([
          fetchAll('orders'),
          fetchAll('customers'),
          fetchAll('order_states'),
          fetchAll('currencies'),
          fetchAll('carriers'),
          fetchAll('order_details'),
        ])

        // Étape 2 : Normalisation
        const rawOrders       = toArray(ordersData?.prestashop?.orders?.order)
        const rawCustomers    = toArray(customersData?.prestashop?.customers?.customer)
        const rawOrderStates  = toArray(orderStatesData?.prestashop?.order_states?.order_state)
        const rawCurrencies   = toArray(currenciesData?.prestashop?.currencies?.currency)
        const rawCarriers     = toArray(carriersData?.prestashop?.carriers?.carrier)
        const rawOrderDetails = toArray(orderDetailsData?.prestashop?.order_details?.order_detail)

        // Étape 3 : Maps

        // Map client : id → nom complet
        const customerMap = {}
        rawCustomers.forEach((c) => {
          const id = String(getVal(c.id))
          customerMap[id] = `${c.firstname || ''} ${c.lastname || ''}`.trim()
        })

        // Map état commande : id → { name, color }
        const orderStateMap = {}
        rawOrderStates.forEach((s) => {
          const id = String(getVal(s.id))
          orderStateMap[id] = {
            name: s.name?.language?.['#text'] || s.name?.language || '—',
            color: getVal(s.color) || '#64748b',
          }
        })

        // Map devise : id → iso_code (EUR, USD...)
        const currencyMap = {}
        rawCurrencies.forEach((c) => {
          const id = String(getVal(c.id))
          currencyMap[id] = getVal(c.iso_code) || '—'
        })

        // Map transporteur : id → nom
        const carrierMap = {}
        rawCarriers.forEach((c) => {
          const id = String(getVal(c.id))
          carrierMap[id] = getVal(c.name) || '—'
        })

        // Map nb produits par commande : id_order → count
        const productCountMap = {}
        rawOrderDetails.forEach((d) => {
          const orderId = String(getVal(d.id_order))
          productCountMap[orderId] = (productCountMap[orderId] || 0) + 1
        })

        // Étape 4 : Enrichissement
        const enriched = rawOrders.map((order) => {
          const id = String(getVal(order.id))
          const customerId = String(getVal(order.id_customer))
          const stateId = String(getVal(order.current_state))
          const currencyId = String(getVal(order.id_currency))
          const carrierId = String(getVal(order.id_carrier))

          const totalHT = parseFloat(getVal(order.total_paid_tax_excl) || 0)
          const totalTTC = parseFloat(getVal(order.total_paid_tax_incl) || 0)

          return {
            id,
            reference: getVal(order.reference) || '—',
            customer: customerMap[customerId] || `Client #${customerId}`,
            state: orderStateMap[stateId]?.name || '—',
            stateColor: orderStateMap[stateId]?.color || '#64748b',
            currency: currencyMap[currencyId] || 'EUR',
            carrier: carrierMap[carrierId] || '—',
            totalHT: totalHT.toFixed(2),
            totalTTC: totalTTC.toFixed(2),
            productCount: productCountMap[id] || 0,
            dateAdd: getVal(order.date_add)?.split(' ')[0] || '—',
            valid: getVal(order.valid),
            raw: order,
          }
        })

        setOrders(enriched)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchEnriched()
  }, [])

  return { orders, loading, error }
}

export default useEnrichedOrders