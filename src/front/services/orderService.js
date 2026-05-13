import axiosInstance from '../../api/axiosInstance'
import { parseXML } from '../../api/xmlParser'

const getVal = (field) => {
  if (field === null || field === undefined) return ''
  if (typeof field === 'object' && field['#text'] !== undefined) return field['#text']
  return field
}

const toArray = (data) => {
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

// Récupère les adresses d'un client
export const getCustomerAddresses = async (customerId) => {
  const response = await axiosInstance.get(`/addresses?display=full&filter[id_customer]=${customerId}`)
  const data = parseXML(response.data)
  return toArray(data?.prestashop?.addresses?.address).filter(
    a => String(getVal(a.deleted)) !== '1'
  )
}

// Récupère le transporteur Click and Collect (sans frais)
export const getClickAndCollectCarrier = async () => {
  const response = await axiosInstance.get('/carriers?display=full')
  const data = parseXML(response.data)
  const carriers = toArray(data?.prestashop?.carriers?.carrier)
  const carrier = carriers.find(c =>
    (getVal(c.name) || '').toLowerCase().includes('click')
  )
  return carrier ? String(getVal(carrier.id)) : '1'
}

// Récupère la devise par défaut
export const getDefaultCurrency = async () => {
  const response = await axiosInstance.get('/currencies?display=full&filter[deleted]=0')
  const data = parseXML(response.data)
  const currencies = toArray(data?.prestashop?.currencies?.currency)
  const def = currencies.find(c => String(getVal(c.conversion_rate)) === '1') || currencies[0]
  return def ? String(getVal(def.id)) : '1'
}

// Crée une adresse pour un client
export const createAddress = async (customerId, addressData) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${customerId}</id_customer>
    <id_country>72</id_country>
    <alias>${addressData.alias || 'Mon adresse'}</alias>
    <firstname>${addressData.firstname}</firstname>
    <lastname>${addressData.lastname}</lastname>
    <address1>${addressData.address1}</address1>
    <city>${addressData.city}</city>
    <phone>${addressData.phone || ''}</phone>
  </address>
</prestashop>`

  const response = await axiosInstance.post('/addresses', xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
  const result = parseXML(response.data)
  return String(getVal(result?.prestashop?.address?.id))
}

// Crée la commande dans PrestaShop
export const createOrder = async ({ customerId, addressId, carrierId, currencyId, cart, totalHT, totalTTC }) => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const reference = 'ORD-' + Date.now().toString(36).toUpperCase()
  const secureKey = Math.random().toString(36).substring(2, 34).padEnd(32, '0')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_cart>0</id_cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>${carrierId}</id_carrier>
    <current_state>2</current_state>
    <module>cod</module>
    <payment>Paiement à la livraison</payment>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <total_discounts>0</total_discounts>
    <total_discounts_tax_incl>0</total_discounts_tax_incl>
    <total_discounts_tax_excl>0</total_discounts_tax_excl>
    <total_paid>${totalTTC}</total_paid>
    <total_paid_tax_incl>${totalTTC}</total_paid_tax_incl>
    <total_paid_tax_excl>${totalHT}</total_paid_tax_excl>
    <total_paid_real>0</total_paid_real>
    <total_products>${totalHT}</total_products>
    <total_products_wt>${totalTTC}</total_products_wt>
    <total_shipping>0</total_shipping>
    <total_shipping_tax_incl>0</total_shipping_tax_incl>
    <total_shipping_tax_excl>0</total_shipping_tax_excl>
    <carrier_tax_rate>0</carrier_tax_rate>
    <total_wrapping>0</total_wrapping>
    <total_wrapping_tax_incl>0</total_wrapping_tax_incl>
    <total_wrapping_tax_excl>0</total_wrapping_tax_excl>
    <round_mode>2</round_mode>
    <round_type>1</round_type>
    <conversion_rate>1</conversion_rate>
    <reference>${reference}</reference>
    <secure_key>${secureKey}</secure_key>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <valid>1</valid>
    <date_add>${now}</date_add>
    <date_upd>${now}</date_upd>
    <invoice_date>0000-00-00 00:00:00</invoice_date>
    <invoice_number>0</invoice_number>
    <shipping_number></shipping_number>
  </order>
</prestashop>`

  const response = await axiosInstance.post('/orders', xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
  const result = parseXML(response.data)
  const orderId = String(getVal(result?.prestashop?.order?.id))
  if (!orderId || orderId === 'undefined') throw new Error('Erreur création commande')

  // Ajouter les order_details (produits de la commande)
  await Promise.all(cart.map(item =>
    addOrderDetail(orderId, customerId, item)
  ))

  return { orderId, reference }
}

// Ajoute un produit à la commande
const addOrderDetail = async (orderId, customerId, item) => {
  const unitPriceTTC = parseFloat(item.price)
  const unitPriceHT  = (unitPriceTTC / 1.20).toFixed(6)
  const totalTTC     = (unitPriceTTC * item.qty).toFixed(6)
  const totalHT      = (parseFloat(unitPriceHT) * item.qty).toFixed(6)

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_detail>
    <id_order>${orderId}</id_order>
    <product_id>${item.productId}</product_id>
    <product_attribute_id>${item.combinationId || 0}</product_attribute_id>
    <product_name>${item.name}${item.attributeLabel ? ' - ' + item.attributeLabel : ''}</product_name>
    <product_quantity>${item.qty}</product_quantity>
    <product_quantity_in_stock>${item.qty}</product_quantity_in_stock>
    <product_price>${unitPriceHT}</product_price>
    <unit_price_tax_incl>${unitPriceTTC}</unit_price_tax_incl>
    <unit_price_tax_excl>${unitPriceHT}</unit_price_tax_excl>
    <total_price_tax_incl>${totalTTC}</total_price_tax_incl>
    <total_price_tax_excl>${totalHT}</total_price_tax_excl>
    <original_product_price>${unitPriceHT}</original_product_price>
    <original_wholesale_price>0</original_wholesale_price>
    <product_weight>0</product_weight>
    <tax_rate>20</tax_rate>
    <tax_name>TVA 20%</tax_name>
    <id_warehouse>0</id_warehouse>
    <id_shop>1</id_shop>
  </order_detail>
</prestashop>`

  await axiosInstance.post('/order_details', xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}