import { useState, useEffect } from 'react'
import axiosInstance from '../api/axiosInstance'
import { parseXML } from '../api/xmlParser'

/**
 * Extrait la valeur d'un champ PrestaShop
 * qui peut être un objet xlink ou une valeur simple
 */
export const getVal = (field) => {
  if (field === null || field === undefined) return null
  if (typeof field === 'object') {
    if (field['#text'] !== undefined) return field['#text']
    return null
  }
  return field
}

/**
 * Normalise une réponse PrestaShop en tableau
 * Gère les cas : undefined, objet seul, tableau
 */
const toArray = (data) => {
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

/**
 * Récupère tous les items d'un endpoint avec display=full
 */
const fetchAll = async (endpoint, language = 1) => {
  const params = new URLSearchParams({ display: 'full', language })
  const response = await axiosInstance.get(`/${endpoint}?${params}`)
  const parsed = parseXML(response.data)
  return parsed
}

/**
 * Hook qui récupère les produits enrichis avec :
 * - Catégories (parent + enfant)
 * - Stock disponible
 * - Taux de TVA → calcul Prix TTC
 * - Fabricant
 * - Image principale
 */
const useEnrichedProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchEnriched = async () => {
      try {
        setLoading(true)
        setError(null)

        // Étape 1 : Récupérer toutes les données en parallèle
        const [
          productsData,
          categoriesData,
          stockData,
          taxRulesData,
          manufacturersData,
        ] = await Promise.all([
          fetchAll('products'),
          fetchAll('categories'),
          fetchAll('stock_availables'),
          fetchAll('tax_rule_groups'),
          fetchAll('manufacturers'),
        ])

        // Étape 2 : Extraire et normaliser les tableaux
        const rawProducts     = toArray(productsData?.prestashop?.products?.product)
        const rawCategories   = toArray(categoriesData?.prestashop?.categories?.category)
        const rawStock        = toArray(stockData?.prestashop?.stock_availables?.stock_available)
        const rawTaxRules     = toArray(taxRulesData?.prestashop?.tax_rule_groups?.tax_rule_group)
        const rawManufacturers = toArray(manufacturersData?.prestashop?.manufacturers?.manufacturer)

        // Étape 3 : Construire des maps pour jointure rapide par ID
        const categoryMap = {}
        rawCategories.forEach((cat) => {
          const id = getVal(cat.id)
          categoryMap[id] = {
            id,
            name: cat.name?.language?.['#text'] || cat.name?.language || '—',
            parentId: getVal(cat.id_parent),
          }
        })

        const stockMap = {}
        rawStock.forEach((s) => {
          const productId = getVal(s.id_product)
          const attrId = getVal(s.id_product_attribute) || 0
          if (attrId == 0) {
            stockMap[productId] = getVal(s.quantity) ?? 0
          }
        })

        const taxMap = {}
        rawTaxRules.forEach((t) => {
          const id = getVal(t.id)
          taxMap[id] = t.name || '—'
        })

        const manufacturerMap = {}
        rawManufacturers.forEach((m) => {
          const id = getVal(m.id)
          manufacturerMap[id] = m.name || '—'
        })

        // Étape 4 : Enrichir chaque produit
        const enriched = rawProducts.map((product) => {
          // Nom
          const name = product.name?.language?.['#text']
            || product.name?.language
            || '—'

          // Prix HT
          const priceHT = parseFloat(getVal(product.price) || 0)

          // Taux TVA → Prix TTC
          const taxRuleId = getVal(product.id_tax_rules_group)
          const taxRate = taxRuleId ? 0.20 : 0 // Taux par défaut 20%
          const priceTTC = priceHT * (1 + taxRate)

          // Catégorie par défaut
          const defaultCatId = getVal(product.id_category_default)
          const defaultCategory = categoryMap[defaultCatId] || null

          // Catégorie parente
          const parentCategory = defaultCategory?.parentId
            ? categoryMap[defaultCategory.parentId] || null
            : null

          // Stock
          const productId = getVal(product.id)
          const quantity = stockMap[productId] ?? 0

          // Fabricant
          const manufacturerId = getVal(product.id_manufacturer)
          const manufacturer = manufacturerMap[manufacturerId] || '—'

          // Image principale
          const imageId = getVal(product.id_default_image)
          const imageUrl = imageId
            ? `${import.meta.env.VITE_PRESTASHOP_URL}/api/images/products/${productId}/${imageId}`
            : null

          // Référence
          const reference = getVal(product.reference) || '—'

          return {
            id: productId,
            name,
            reference,
            priceHT: priceHT.toFixed(2),
            priceTTC: priceTTC.toFixed(2),
            quantity,
            active: getVal(product.active),
            manufacturer,
            categoryDefault: defaultCategory?.name || '—',
            categoryParent: parentCategory?.name || '—',
            imageUrl,
            raw: product, // données brutes disponibles si besoin
          }
        })

        setProducts(enriched)
      } catch (err) {
        setError(err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchEnriched()
  }, [])

  return { products, loading, error }
}

export default useEnrichedProducts