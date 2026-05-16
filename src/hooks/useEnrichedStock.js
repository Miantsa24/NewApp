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
 * Hook qui récupère le stock enrichi avec :
 * - Nom du produit lié
 * - Référence du produit
 * - Nom de la déclinaison si existe
 * - Statut rupture de stock
 */
const useEnrichedStock = () => {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEnriched = async () => {
      try {
        setLoading(true)
        setError(null)

        // Étape 1 : Requêtes en parallèle
        const [stockData, productsData, combinationsData] = await Promise.all([
          fetchAll('stock_availables'),
          fetchAll('products'),
          fetchAll('combinations'),
        ])

        // Étape 2 : Normalisation
        const rawStock        = toArray(stockData?.prestashop?.stock_availables?.stock_available)
        const rawProducts     = toArray(productsData?.prestashop?.products?.product)
        const rawCombinations = toArray(combinationsData?.prestashop?.combinations?.combination)

        // Étape 3 : Maps

        // Map produit : id → { name, reference }
        const productMap = {}
        rawProducts.forEach((p) => {
          const id = String(getVal(p.id))
          productMap[id] = {
            name: p.name?.language?.['#text'] || p.name?.language || '—',
            reference: getVal(p.reference) || '—',
          }
        })

        // Map déclinaison : id → référence
        const combinationMap = {}
        rawCombinations.forEach((c) => {
          const id = String(getVal(c.id))
          combinationMap[id] = getVal(c.reference) || null
        })

        // Étape 4 : Filtrer les lignes produit-niveau redondantes
        // Pour un produit avec déclinaisons, PS crée une entrée id_product_attribute=0 (somme)
        // ET une entrée par déclinaison. On n'affiche que les déclinaisons.
        const productsWithCombinations = new Set(
          rawStock
            .filter(s => {
              const c = String(getVal(s.id_product_attribute))
              return c && c !== '0'
            })
            .map(s => String(getVal(s.id_product)))
        )
        const filteredStock = rawStock.filter(s => {
          const productId = String(getVal(s.id_product))
          const combId    = String(getVal(s.id_product_attribute))
          const isProductLevel = !combId || combId === '0'
          return !(isProductLevel && productsWithCombinations.has(productId))
        })

        // Étape 5 : Enrichissement
        const enriched = filteredStock.map((s) => {
          const productId     = String(getVal(s.id_product))
          const combinationId = String(getVal(s.id_product_attribute))
          const quantity      = parseInt(getVal(s.quantity) || 0)

          // Nom et référence produit
          const product = productMap[productId] || { name: `Produit #${productId}`, reference: '—' }

          // Déclinaison liée si existe (id 0 = pas de déclinaison)
          const hasCombination = combinationId && combinationId !== '0'
          const combinationRef = hasCombination
            ? combinationMap[combinationId] || `Déclinaison #${combinationId}`
            : null

          // Statut stock
          const outOfStock   = quantity <= 0
          const lowStock     = quantity > 0 && quantity <= 5

          return {
            id: String(getVal(s.id)),
            productId,
            productName: product.name,
            productReference: product.reference,
            combinationId: hasCombination ? combinationId : null,
            combinationRef,
            quantity,
            outOfStock,
            lowStock,
            dependsOnStock: getVal(s.depends_on_stock),
            outOfStockAction: getVal(s.out_of_stock),
            raw: s,
          }
        })

        // Trier : rupture en premier, puis stock faible, puis normal
        enriched.sort((a, b) => {
          if (a.outOfStock !== b.outOfStock) return a.outOfStock ? -1 : 1
          if (a.lowStock !== b.lowStock) return a.lowStock ? -1 : 1
          return a.productName.localeCompare(b.productName)
        })

        setStock(enriched)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchEnriched()
  }, [])

  return { stock, loading, error }
}

export default useEnrichedStock