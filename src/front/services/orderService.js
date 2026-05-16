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

export const getCustomerAddresses = async (customerId) => {
  const response = await axiosInstance.get(`/addresses?display=full&filter[id_customer]=${customerId}`)
  const data = parseXML(response.data)
  return toArray(data?.prestashop?.addresses?.address).filter(
    a => String(getVal(a.deleted)) !== '1'
  )
}

export const getClickAndCollectCarrier = async () => {
  const response = await axiosInstance.get('/carriers?display=full')
  const data = parseXML(response.data)
  const carriers = toArray(data?.prestashop?.carriers?.carrier)
  const carrier = carriers.find(c =>
    (getVal(c.name) || '').toLowerCase().includes('click')
  )
  return carrier ? String(getVal(carrier.id)) : '1'
}

export const getDefaultCurrency = async () => {
  const response = await axiosInstance.get('/currencies?display=full&filter[deleted]=0')
  const data = parseXML(response.data)
  const currencies = toArray(data?.prestashop?.currencies?.currency)
  const def = currencies.find(c => String(getVal(c.conversion_rate)) === '1') || currencies[0]
  return def ? String(getVal(def.id)) : '1'
}

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

// ── LocalStorage helpers pour le cart PS ──────────────────────
const psCartKey = (customerId) => `ps_cart_${customerId}`

export const getStoredPsCart = (customerId) => {
  try {
    const raw = localStorage.getItem(psCartKey(customerId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveStoredPsCart = (customerId, cartId, cartSecureKey) => {
  localStorage.setItem(psCartKey(customerId), JSON.stringify({ cartId, cartSecureKey }))
}

export const clearPsCart = (customerId) => {
  localStorage.removeItem(psCartKey(customerId))
}

// ── PS Cart API ────────────────────────────────────────────────

/**
 * Crée un cart PS vide pour un client (adresse=0, sera mise à jour à la validation).
 * Sauvegarde l'ID + secure_key en localStorage.
 */
export const createEmptyPsCart = async (customerId, currencyId, carrierId) => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_address_delivery>0</id_address_delivery>
    <id_address_invoice>0</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${now}</date_add>
    <date_upd>${now}</date_upd>
  </cart>
</prestashop>`

  const response = await axiosInstance.post('/carts', xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
  const result = parseXML(response.data)
  const cartId = String(getVal(result?.prestashop?.cart?.id))
  const cartSecureKey = String(getVal(result?.prestashop?.cart?.secure_key))
  if (!cartId || cartId === 'undefined') throw new Error('Erreur création panier PS')
  saveStoredPsCart(customerId, cartId, cartSecureKey)
  return { cartId, cartSecureKey }
}

/**
 * Synchronise les lignes du cart PS avec les articles du panier localStorage.
 * Appelé après chaque ajout/retrait d'article et à la validation (avec la vraie adresse).
 */
export const syncPsCartRows = async ({
  cartId, cartSecureKey, customerId, currencyId, carrierId, addressId = '0', items,
}) => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const cartRowsXml = items.map(item =>
    `        <cart_row>
          <id_product>${item.productId}</id_product>
          <id_product_attribute>${item.combinationId || 0}</id_product_attribute>
          <id_address_delivery>${addressId}</id_address_delivery>
          <id_customization>0</id_customization>
          <quantity>${item.qty}</quantity>
        </cart_row>`
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${cartId}</id>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${now}</date_add>
    <date_upd>${now}</date_upd>
    <secure_key>${cartSecureKey}</secure_key>
    <associations>
      <cart_rows nodeType="cart_row" api="cart_rows">
${cartRowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`

  await axiosInstance.put(`/carts/${cartId}`, xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}

/**
 * Supprime le cart PS et efface le localStorage.
 * Appelé quand le panier est vidé ou après une commande réussie.
 */
export const deletePsCart = async (customerId, cartId) => {
  clearPsCart(customerId)
  await axiosInstance.delete(`/carts/${cartId}`)
}

/**
 * Crée une commande depuis le panier client.
 * Si existingCartId est fourni (cart PS déjà créé), l'étape 1 est sautée.
 * L'étape 2 (sync lignes + adresse) est toujours exécutée.
 */
export const createOrder = async ({
  customerId, addressId, carrierId, currencyId, cart, totalHT, totalTTC,
  existingCartId, existingCartSecureKey,
}) => {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

  let cartId, cartSecureKey

  if (existingCartId) {
    cartId = existingCartId
    cartSecureKey = existingCartSecureKey
  } else {
    // Étape 1 : créer le panier PrestaShop
    const cartXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${now}</date_add>
    <date_upd>${now}</date_upd>
  </cart>
</prestashop>`

    const cartResponse = await axiosInstance.post('/carts', cartXml, {
      headers: { 'Content-Type': 'application/xml' },
    })
    const cartResult = parseXML(cartResponse.data)
    cartId = String(getVal(cartResult?.prestashop?.cart?.id))
    cartSecureKey = String(getVal(cartResult?.prestashop?.cart?.secure_key))
    if (!cartId || cartId === 'undefined') throw new Error('Erreur création panier')
  }

  // Étape 2 : peupler le panier — met à jour adresse + lignes (toujours exécutée)
  const cartRowsXml = cart.map(item =>
    `        <cart_row>
          <id_product>${item.productId}</id_product>
          <id_product_attribute>${item.combinationId || 0}</id_product_attribute>
          <id_address_delivery>${addressId}</id_address_delivery>
          <id_customization>0</id_customization>
          <quantity>${item.qty}</quantity>
        </cart_row>`
  ).join('\n')

  const cartUpdateXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${cartId}</id>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${now}</date_add>
    <date_upd>${now}</date_upd>
    <secure_key>${cartSecureKey}</secure_key>
    <associations>
      <cart_rows nodeType="cart_row" api="cart_rows">
${cartRowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`

  await axiosInstance.put(`/carts/${cartId}`, cartUpdateXml, {
    headers: { 'Content-Type': 'application/xml' },
  })

  // Étape 3 : créer la commande
  const orderXml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${addressId}</id_address_delivery>
    <id_address_invoice>${addressId}</id_address_invoice>
    <id_cart>${cartId}</id_cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${customerId}</id_customer>
    <id_carrier>${carrierId}</id_carrier>
    <module>ps_cashondelivery</module>
    <payment>Paiement a la livraison</payment>
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
    <total_paid_real>${totalTTC}</total_paid_real>
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
    <secure_key>${cartSecureKey}</secure_key>
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

  let orderResponse
  try {
    orderResponse = await axiosInstance.post('/orders', orderXml, {
      headers: { 'Content-Type': 'application/xml' },
    })
  } catch (err) {
    console.error('Order creation error:', err.response?.data)
    throw err
  }

  const orderResult = parseXML(orderResponse.data)
  const orderId = String(getVal(orderResult?.prestashop?.order?.id))
  if (!orderId || orderId === 'undefined') throw new Error('Erreur création commande')

  // Étape 4 : passer l'état à 2 "Paiement accepté" via GET + PUT
  const getResp = await axiosInstance.get(`/orders/${orderId}?display=full`)
  const orderData = parseXML(getResp.data)
  const order = orderData?.prestashop?.order
  if (!order) throw new Error('Impossible de récupérer la commande créée')

  const reference = String(getVal(order.reference))

  const updateXml = buildOrderStateXml(order, '2')
  await axiosInstance.put(`/orders/${orderId}`, updateXml, {
    headers: { 'Content-Type': 'application/xml' },
  })

  return { orderId, reference }
}

const buildOrderStateXml = (order, newState) => `<?xml version="1.0" encoding="UTF-8"?>
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
    <current_state>${newState}</current_state>
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
