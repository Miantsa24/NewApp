import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

// IDs des états de commande PrestaShop
export const ORDER_STATES = {
  PAYMENT_ACCEPTED: '2', // Paiement effectué
  PAYMENT_ERROR:    '8', // Échec paiement
  CANCELLED:        '6', // Annulé
}

export const getAllOrders = async () => {
  const response = await axiosInstance.get('/orders')
  return parseXML(response.data)
}

export const getOrderById = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}?language=1`)
  return parseXML(response.data)
}

export const deleteOrderById = async (id) => {
  await axiosInstance.delete(`/orders/${id}`)
}

export const deleteAllOrders = async () => {
  const data = await getAllOrders()
  const ordersList = data?.prestashop?.orders?.order
  if (!ordersList) return
  const ordersArray = Array.isArray(ordersList) ? ordersList : [ordersList]
  await Promise.all(ordersArray.map((o) => deleteOrderById(o['@_id'])))
}

/**
 * Met à jour l'état d'une commande dans PrestaShop
 * PrestaShop exige le renvoi de l'objet complet lors d'un PUT
 * Étape 1 : GET pour récupérer les données actuelles
 * Étape 2 : Modifier current_state
 * Étape 3 : PUT avec l'objet complet reconstruit en XML
 */
export const updateOrderState = async (orderId, newStateId) => {
  // Étape 1 : Récupérer la commande actuelle
  const current = await getOrderById(orderId)
  const order = current?.prestashop?.order
  if (!order) throw new Error(`Commande #${orderId} introuvable`)

  // Étape 2 : Construire le XML complet avec le nouvel état
  // On reconstruit les champs obligatoires que PrestaShop exige
  const xml = buildOrderXml(order, newStateId)

  // Étape 3 : PUT avec le XML complet
  const response = await axiosInstance.put(`/orders/${orderId}`, xml, {
    headers: { 'Content-Type': 'application/xml' },
  })

  return parseXML(response.data)
}

/**
 * Reconstruit le XML complet d'une commande
 * en remplaçant uniquement current_state
 * PrestaShop rejette les PUT avec des champs manquants
 */
const buildOrderXml = (order, newStateId) => {
  const getVal = (field) => {
    if (!field) return ''
    if (typeof field === 'object' && field['#text'] !== undefined)
      return field['#text']
    return field
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id>${getVal(order.id)}</id>
    <id_address_delivery>${getVal(order.id_address_delivery)}</id_address_delivery>
    <id_address_invoice>${getVal(order.id_address_invoice)}</id_address_invoice>
    <id_cart>${getVal(order.id_cart)}</id_cart>
    <id_currency>${getVal(order.id_currency)}</id_currency>
    <id_lang>${getVal(order.id_lang)}</id_lang>
    <id_customer>${getVal(order.id_customer)}</id_customer>
    <id_carrier>${getVal(order.id_carrier)}</id_carrier>
    <current_state>${newStateId}</current_state>
    <module>${getVal(order.module)}</module>
    <invoice_number>${getVal(order.invoice_number)}</invoice_number>
    <invoice_date>${getVal(order.invoice_date)}</invoice_date>
    <valid>${getVal(order.valid)}</valid>
    <date_add>${getVal(order.date_add)}</date_add>
    <date_upd>${getVal(order.date_upd)}</date_upd>
    <shipping_number>${getVal(order.shipping_number)}</shipping_number>
    <id_shop_group>${getVal(order.id_shop_group)}</id_shop_group>
    <id_shop>${getVal(order.id_shop)}</id_shop>
    <secure_key>${getVal(order.secure_key)}</secure_key>
    <payment>${getVal(order.payment)}</payment>
    <recyclable>${getVal(order.recyclable)}</recyclable>
    <gift>${getVal(order.gift)}</gift>
    <gift_message>${getVal(order.gift_message)}</gift_message>
    <mobile_theme>${getVal(order.mobile_theme)}</mobile_theme>
    <total_discounts>${getVal(order.total_discounts)}</total_discounts>
    <total_discounts_tax_incl>${getVal(order.total_discounts_tax_incl)}</total_discounts_tax_incl>
    <total_discounts_tax_excl>${getVal(order.total_discounts_tax_excl)}</total_discounts_tax_excl>
    <total_paid>${getVal(order.total_paid)}</total_paid>
    <total_paid_tax_incl>${getVal(order.total_paid_tax_incl)}</total_paid_tax_incl>
    <total_paid_tax_excl>${getVal(order.total_paid_tax_excl)}</total_paid_tax_excl>
    <total_paid_real>${getVal(order.total_paid_real)}</total_paid_real>
    <total_products>${getVal(order.total_products)}</total_products>
    <total_products_wt>${getVal(order.total_products_wt)}</total_products_wt>
    <total_shipping>${getVal(order.total_shipping)}</total_shipping>
    <total_shipping_tax_incl>${getVal(order.total_shipping_tax_incl)}</total_shipping_tax_incl>
    <total_shipping_tax_excl>${getVal(order.total_shipping_tax_excl)}</total_shipping_tax_excl>
    <carrier_tax_rate>${getVal(order.carrier_tax_rate)}</carrier_tax_rate>
    <total_wrapping>${getVal(order.total_wrapping)}</total_wrapping>
    <total_wrapping_tax_incl>${getVal(order.total_wrapping_tax_incl)}</total_wrapping_tax_incl>
    <total_wrapping_tax_excl>${getVal(order.total_wrapping_tax_excl)}</total_wrapping_tax_excl>
    <round_mode>${getVal(order.round_mode)}</round_mode>
    <round_type>${getVal(order.round_type)}</round_type>
    <conversion_rate>${getVal(order.conversion_rate)}</conversion_rate>
    <reference>${getVal(order.reference)}</reference>
  </order>
</prestashop>`
}