import { useMemo } from 'react'
import { ORDER_STATES } from '../api/services/ordersService'

const getVal = (field) => {
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

const useProfitStats = (orders, products, stock) => {
  return useMemo(() => {

    // ── Stock actuel par productId (somme déclinaisons) ──
    const stockQtyMap = {}
    stock.forEach(s => {
      const pid = String(s.productId)
      stockQtyMap[pid] = (stockQtyMap[pid] || 0) + s.quantity
    })

    // ── Quantités vendues (livrées) par productId ──
    const delivered = orders.filter(o =>
  o.stateId === ORDER_STATES.DELIVERED || o.stateId === ORDER_STATES.PAYMENT_ACCEPTED
)

    const soldQtyMap = {}
    delivered.forEach(order => {
      const rows = toArray(order.raw?.associations?.order_rows?.order_row)
      rows.forEach(row => {
        const pid = String(getVal(row.product_id))
        const qty = parseFloat(getVal(row.product_quantity) || 0)
        soldQtyMap[pid] = (soldQtyMap[pid] || 0) + qty
      })
    })

    // ── Stock initial = stock actuel + vendu livré ──
    const initialQtyMap = {}
    products.forEach(p => {
      const pid = String(p.id)
      const actuel = stockQtyMap[pid] ?? parseInt(p.quantity || 0)
      const vendu  = soldQtyMap[pid] || 0
      initialQtyMap[pid] = actuel + vendu
    })

    // ── Achats HT = SUM(stock initial × wholesale_price) ──
const productWholesaleMap = {}
products.forEach(p => {
  productWholesaleMap[String(p.id)] = {
    wholesale: parseFloat(p.wholesalePrice || 0),
    cat: p.categoryDefault || '—',
  }
})

const catAchatsMap = {}
let achatsHT = 0

delivered.forEach(order => {
  const rows = toArray(order.raw?.associations?.order_rows?.order_row)
  rows.forEach(row => {
    const pid = String(getVal(row.product_id))
    const qty = parseFloat(getVal(row.product_quantity) || 0)
    const { wholesale, cat } = productWholesaleMap[pid] || { wholesale: 0, cat: '—' }
    const ligneAchat = qty * wholesale

    achatsHT += ligneAchat
    if (!catAchatsMap[cat]) catAchatsMap[cat] = 0
    catAchatsMap[cat] += ligneAchat
  })
})

    // ── Ventes HT = commandes livrées, total_paid_tax_excl ──
    const ventesHT = delivered.reduce((sum, o) => sum + parseFloat(o.totalHT || 0), 0)

    // ── Ventes HT par catégorie depuis order_rows ──
    const productCatMap = {}
    products.forEach(p => {
      productCatMap[String(p.id)] = p.categoryDefault || '—'
    })

    const catVentesMap = {}
    delivered.forEach(order => {
      const rows = toArray(order.raw?.associations?.order_rows?.order_row)
      rows.forEach(row => {
        const pid         = String(getVal(row.product_id))
        const qty         = parseFloat(getVal(row.product_quantity) || 0)
        const unitPriceHT = parseFloat(getVal(row.unit_price_tax_excl) || 0)
        const cat         = productCatMap[pid] || '—'

        if (!catVentesMap[cat]) catVentesMap[cat] = 0
        catVentesMap[cat] += unitPriceHT * qty
      })
    })

    // ── Bénéfice global ──
    const benefice = ventesHT - achatsHT

    // ── Tableau par catégorie ──
    const allCats = new Set([...Object.keys(catVentesMap), ...Object.keys(catAchatsMap)])
    const byCategory = Array.from(allCats).map(cat => {
      const v = catVentesMap[cat] || 0
      const a = catAchatsMap[cat] || 0
      return { name: cat, ventesHT: v, achatsHT: a, benefice: v - a }
    }).sort((a, b) => b.ventesHT - a.ventesHT)

    return { ventesHT, achatsHT, benefice, byCategory }
  }, [orders, products, stock])
}

export default useProfitStats