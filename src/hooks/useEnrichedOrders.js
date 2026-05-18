import { useState, useEffect, useCallback } from 'react'
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

const IN_CART_COLOR = '#d97706'

const useEnrichedOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const fetchEnriched = async () => {
      try {
        setLoading(true)
        setError(null)

        const [
          ordersData,
          cartsData,
          customersData,
          orderStatesData,
          currenciesData,
          carriersData,
          orderDetailsData,
          productsData,
        ] = await Promise.all([
          fetchAll('orders'),
          fetchAll('carts'),
          fetchAll('customers'),
          fetchAll('order_states'),
          fetchAll('currencies'),
          fetchAll('carriers'),
          fetchAll('order_details'),
          fetchAll('products'),
        ])

        const rawOrders       = toArray(ordersData?.prestashop?.orders?.order)
        const rawCarts        = toArray(cartsData?.prestashop?.carts?.cart)
        const rawCustomers    = toArray(customersData?.prestashop?.customers?.customer)
        const rawOrderStates  = toArray(orderStatesData?.prestashop?.order_states?.order_state)
        const rawCurrencies   = toArray(currenciesData?.prestashop?.currencies?.currency)
        const rawCarriers     = toArray(carriersData?.prestashop?.carriers?.carrier)
        const rawOrderDetails = toArray(orderDetailsData?.prestashop?.order_details?.order_detail)
        const rawProducts     = toArray(productsData?.prestashop?.products?.product)

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
          const lang = s.name?.language
          const stateName = typeof lang === 'string'
            ? lang
            : (lang?.['#text'] != null ? String(lang['#text']) : null)
              ?? (Array.isArray(lang) && lang[0]?.['#text'] != null ? String(lang[0]['#text']) : null)
              ?? '—'
          orderStateMap[id] = {
            name: stateName || '—',
            color: getVal(s.color) || '#64748b',
          }
        })

        // Map devise : id → iso_code
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

        // Map quantité totale par commande (somme des product_quantity de chaque ligne)
        const productCountMap = {}
        rawOrderDetails.forEach((d) => {
          const orderId = String(getVal(d.id_order))
          const qty = parseInt(getVal(d.product_quantity) || 1)
          productCountMap[orderId] = (productCountMap[orderId] || 0) + qty
        })

        // Map prix produit : id → { priceHT, priceTTC }
        const productPriceMap = {}
        rawProducts.forEach((p) => {
          const id = String(getVal(p.id))
          const priceHT = parseFloat(getVal(p.price) || 0)
          const taxRuleId = getVal(p.id_tax_rules_group)
          productPriceMap[id] = {
            priceHT,
            priceTTC: priceHT * (taxRuleId ? 1.20 : 1),
          }
        })

        // Enrichissement des commandes
        const enrichedOrders = rawOrders.map((order) => {
          const id         = String(getVal(order.id))
          const customerId = String(getVal(order.id_customer))
          const stateId    = String(getVal(order.current_state))
          const currencyId = String(getVal(order.id_currency))
          const carrierId  = String(getVal(order.id_carrier))
          const totalHT    = parseFloat(getVal(order.total_paid_tax_excl) || 0)
          const totalTTC   = parseFloat(getVal(order.total_paid_tax_incl) || 0)

          return {
            id,
            type: 'order',
            stateId,
            reference: getVal(order.reference) || '—',
            customer: customerMap[customerId] || `Client #${customerId}`,
            state: orderStateMap[stateId]?.name || '—',
            stateColor: orderStateMap[stateId]?.color || '#64748b',
            currency: currencyMap[currencyId] || '—',
            carrier: carrierMap[carrierId] || '—',
            totalHT: totalHT.toFixed(2),
            totalTTC: totalTTC.toFixed(2),
            productCount: productCountMap[id] || 0,
            dateAdd: getVal(order.date_add)?.split(' ')[0] || '—',
            dateUpd: getVal(order.date_upd)?.split(' ')[0] || '—',
            raw: order,
          }
        })

        // IDs de paniers déjà convertis en commande → ne pas les afficher comme panier
        const cartIdsWithOrders = new Set(rawOrders.map((o) => String(getVal(o.id_cart))))

        // Enrichissement des paniers orphelins (non encore commande, avec produits)
        const enrichedCarts = rawCarts
          .filter((cart) => {
            const cartId = String(getVal(cart.id))
            if (cartIdsWithOrders.has(cartId)) return false
            const rows = toArray(cart?.associations?.cart_rows?.cart_row)
            return rows.length > 0
          })
          .map((cart) => {
            const cartId          = String(getVal(cart.id))
            const customerId      = String(getVal(cart.id_customer))
            const currencyId      = String(getVal(cart.id_currency))
            const carrierId       = String(getVal(cart.id_carrier))
            const addressId       = String(getVal(cart.id_address_delivery))
            const addressInvoiceId = String(getVal(cart.id_address_invoice))
            const rows            = toArray(cart?.associations?.cart_rows?.cart_row)

            // Calcul des totaux depuis les lignes du panier
            let totalHT  = 0
            let totalTTC = 0
            rows.forEach((row) => {
              const productId = String(getVal(row.id_product))
              const qty = parseInt(getVal(row.quantity) || 0, 10)
              const prices = productPriceMap[productId]
              if (prices && qty > 0) {
                totalHT  += prices.priceHT  * qty
                totalTTC += prices.priceTTC * qty
              }
            })

            return {
              id: `cart-${cartId}`,
              type: 'cart',
              stateId: 'cart',
              rawCartId: cartId,
              customerId,
              currencyId,
              carrierId,
              addressId,
              addressInvoiceId,
              cartSecureKey: String(getVal(cart.secure_key) || ''),
              reference: '—',
              customer: customerMap[customerId] || `Client #${customerId}`,
              state: 'Dans le panier',
              stateColor: IN_CART_COLOR,
              currency: currencyMap[currencyId] || '—',
              carrier: '—',
              totalHT: totalHT.toFixed(2),
              totalTTC: totalTTC.toFixed(2),
              productCount: rows.reduce((sum, row) => sum + parseInt(getVal(row.quantity) || 0), 0),
              dateAdd: getVal(cart.date_add)?.split(' ')[0] || '—',
              raw: cart,
            }
          })

        // Fusion et tri par date décroissante
        const allItems = [...enrichedCarts, ...enrichedOrders].sort((a, b) => {
          const da = a.dateAdd === '—' ? '' : a.dateAdd
          const db = b.dateAdd === '—' ? '' : b.dateAdd
          return db.localeCompare(da)
        })

        setOrders(allItems)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchEnriched()
  }, [refreshKey])

  return { orders, loading, error, refresh }
}

export default useEnrichedOrders
