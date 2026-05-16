import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

export const getAllStock = async () => {
  const response = await axiosInstance.get('/stock_availables')
  return parseXML(response.data)
}

export const getStockById = async (id) => {
  const response = await axiosInstance.get(`/stock_availables/${id}`)
  return parseXML(response.data)
}

/**
 * Récupère un enregistrement stock_available complet et renvoie l'objet brut PS.
 * Nécessaire pour le PUT car PS exige tous les champs.
 */
const getStockRecord = async (id) => {
  const parsed = await getStockById(id)
  return parsed?.prestashop?.stock_available || null
}

/**
 * Extrait la valeur d'un champ PS (qui peut être string ou objet {#text}).
 */
const val = (field) => {
  if (field === null || field === undefined) return ''
  if (typeof field === 'object') {
    if (field['#text'] !== undefined) return field['#text']
    return ''
  }
  return field
}

/**
 * Construit le payload XML pour mettre à jour la quantité d'un stock_available.
 * PS exige tous les champs présents dans le PUT, pas juste celui modifié.
 */
const buildStockXML = (record, newQuantity) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id>${val(record.id)}</id>
    <id_product>${val(record.id_product)}</id_product>
    <id_product_attribute>${val(record.id_product_attribute)}</id_product_attribute>
    <id_shop>${val(record.id_shop)}</id_shop>
    <id_shop_group>${val(record.id_shop_group)}</id_shop_group>
    <quantity>${newQuantity}</quantity>
    <depends_on_stock>${val(record.depends_on_stock)}</depends_on_stock>
    <out_of_stock>${val(record.out_of_stock)}</out_of_stock>
    <location>${val(record.location)}</location>
  </stock_available>
</prestashop>`
}

/**
 * Ajoute une quantité au stock existant d'un enregistrement stock_available.
 * @param {string|number} stockId - id de l'enregistrement stock_available
 * @param {number} quantityToAdd - quantité à AJOUTER (pas remplacer)
 * @returns {Promise<{success: boolean, newQuantity: number}>}
 */
export const addStock = async (stockId, quantityToAdd) => {
  const record = await getStockRecord(stockId)
  if (!record) {
    throw new Error(`Enregistrement stock #${stockId} introuvable`)
  }

  const currentQty = parseInt(val(record.quantity) || 0)
  const newQty = currentQty + parseInt(quantityToAdd)

  const xml = buildStockXML(record, newQty)

  await axiosInstance.put(`/stock_availables/${stockId}`, xml)

  return { success: true, newQuantity: newQty, previousQuantity: currentQty }
}