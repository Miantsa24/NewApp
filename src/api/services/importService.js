import Papa from 'papaparse'
import JSZip from 'jszip'
import axiosInstance from '../axiosInstance'
import { parseXML } from '../xmlParser'

// Extrait la valeur d'un champ fast-xml-parser (CDATA, xlink, ou scalaire)
const getVal = (f) => {
  if (f === null || f === undefined) return ''
  if (typeof f === 'object') return String(f['#text'] ?? '')
  return String(f)
}
import {
  buildXmlFromMapping,
  buildTaxRulesGroupXml,
  buildTaxRuleXml,
  buildProductOptionXml,
  buildProductOptionValueXml,
  buildCombinationXml,
  buildStockUpdateXml,
  ImportRegistry,
} from '../utils/detectModules'
import { MODULES_CONFIG } from '../utils/modulesConfig'
import { updateOrderState } from './ordersService'

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 300
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Helpers parsing réponse PrestaShop ───────────────────────────────────────

const extractIdFromResponse = (responseData) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(responseData, 'application/xml')
    const idEl = doc.querySelector('id')
    return idEl?.textContent?.trim() || null
  } catch {
    return null
  }
}

const extractFieldFromResponse = (responseData, selector) => {
  try {
    const doc = new DOMParser().parseFromString(responseData, 'application/xml')
    return doc.querySelector(selector)?.textContent?.trim() || null
  } catch {
    return null
  }
}

const extractStockAvailableIdFromProductResponse = (responseData) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(responseData, 'application/xml')
    const el = doc.querySelector('stock_availables stock_available id')
    return el?.textContent?.trim() || null
  } catch {
    return null
  }
}

// ─── Parsers CSV ──────────────────────────────────────────────────────────────

export const detectDelimiter = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const firstLine = e.target.result.split('\n')[0]
      const candidates = [';', ',', '|', '\t']
      let bestSep = ';'
      let bestCount = 0
      for (const sep of candidates) {
        const count = firstLine.split(sep).length - 1
        if (count > bestCount) { bestCount = count; bestSep = sep }
      }
      resolve({ delimiter: bestSep, count: bestCount })
    }
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
    reader.readAsText(file)
  })
}

export const parseCsvFile = (file, delimiter = ';') => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`Erreur CSV : ${results.errors[0].message}`))
        } else {
          resolve(results.data)
        }
      },
      error: (err) => reject(err),
    })
  })
}

// ─── POST / PUT génériques ────────────────────────────────────────────────────

const postXml = async (endpoint, xml) => {
  const response = await axiosInstance.post(`/${endpoint}`, xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
  return response.data
}

const putXml = async (endpoint, id, xml) => {
  const response = await axiosInstance.put(`/${endpoint}/${id}`, xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
  return response.data
}

// ─── Import TAXES ─────────────────────────────────────────────────────────────

const importTaxRows = async (rows, mapping, registry, onProgress) => {
  const seen = new Map()
  for (const row of rows) {
    const key = MODULES_CONFIG.taxes.registryKey(row)
    if (key && !seen.has(key)) seen.set(key, row)
  }
  const uniqueRows = [...seen.values()]
  const total = uniqueRows.length
  const results = { success: 0, errors: [], skipped: rows.length - total }

  for (let i = 0; i < total; i++) {
    const row = uniqueRows[i]
    const taxKey = MODULES_CONFIG.taxes.registryKey(row)
    try {
      const taxXml = buildXmlFromMapping(row, 'taxes', mapping)
      const taxResp = await postXml('taxes', taxXml)
      const idTax = extractIdFromResponse(taxResp)
      if (!idTax) throw new Error('ID tax non récupéré depuis PrestaShop')

      const rateVal = taxKey
      const groupXml = buildTaxRulesGroupXml(`TVA ${rateVal}%`)
      const groupResp = await postXml('tax_rule_groups', groupXml)
      const idGroup = extractIdFromResponse(groupResp)
      if (!idGroup) throw new Error('ID tax_rules_group non récupéré')

      const ruleXml = buildTaxRuleXml(idGroup, idTax)
      await postXml('tax_rules', ruleXml)

      registry.set('taxes', taxKey, { id: idTax, taxRulesGroupId: idGroup })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import CATEGORIES ────────────────────────────────────────────────────────

const importCategoryRows = async (rows, mapping, registry, onProgress) => {
  const seen = new Map()
  for (const row of rows) {
    const key = MODULES_CONFIG.categories.registryKey(row)
    if (key && !seen.has(key)) seen.set(key, row)
  }
  const uniqueRows = [...seen.values()]
  const total = uniqueRows.length
  const results = { success: 0, errors: [], skipped: rows.length - total }

  for (let i = 0; i < total; i++) {
    const row = uniqueRows[i]
    const catKey = MODULES_CONFIG.categories.registryKey(row)
    try {
      const xml = buildXmlFromMapping(row, 'categories', mapping, registry)
      const resp = await postXml('categories', xml)
      const id = extractIdFromResponse(resp)
      if (!id) throw new Error('ID catégorie non récupéré')
      registry.set('categories', catKey, { id })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import PRODUCTS ──────────────────────────────────────────────────────────

const importProductRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const ref = MODULES_CONFIG.products.registryKey(row)
    try {
      const xml = buildXmlFromMapping(row, 'products', mapping, registry)
      const resp = await postXml('products', xml)
      const id = extractIdFromResponse(resp)
      if (!id) throw new Error('ID produit non récupéré')
      const stockAvailableId = extractStockAvailableIdFromProductResponse(resp)
      registry.set('products', ref, { id, stockAvailableId })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) await sleep(BATCH_DELAY_MS)
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import COMBINATIONS ──────────────────────────────────────────────────────

const importCombinationRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  const optionRegistry = new ImportRegistry()
  const optionValueRegistry = new ImportRegistry()

  const getSpecKey = (row) => {
    const k = Object.keys(row).find(k => {
      const n = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_]/g, '')
      return n === 'specificite'
    })
    return k ? row[k] : ''
  }
  const getValKey = (row) => {
    const k = Object.keys(row).find(k => k.toLowerCase() === 'karazany')
    return k ? row[k] : ''
  }
  const getPrixKey = (row) => {
    const k = Object.keys(row).find(k => {
      const n = k.toLowerCase().replace(/[^a-z0-9_]/g, '')
      return n === 'prix_vente_ttc' || n === 'prixventtc' || n === 'prixvettc'
    })
    return k ? row[k] : ''
  }
  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const ref = row['reference'] || row['Reference'] || ''
    const specificite = getSpecKey(row)
    const karazany = getValKey(row)
    const prixTTC = getPrixKey(row)

    const productEntry = registry.get('products', ref)
    if (!productEntry?.id) {
      results.errors.push({
        line: i + 2,
        message: `Produit "${ref}" introuvable dans le registre — importer d'abord les produits`,
        row,
      })
      onProgress?.(Math.round(((i + 1) / total) * 100), results)
      continue
    }
    const idProduct = productEntry.id

    try {
      // Produit simple (pas de déclinaison) : rien à créer ici,
      // le stock sera mis à jour par importStockRows
      if (!specificite || !karazany) {
        results.success++
        onProgress?.(Math.round(((i + 1) / total) * 100), results)
        continue
      }

      if (!optionRegistry.has('opt', specificite)) {
        const optXml = buildProductOptionXml(specificite)
        const optResp = await postXml('product_options', optXml)
        const idOpt = extractIdFromResponse(optResp)
        if (!idOpt) throw new Error(`ID product_option non récupéré pour "${specificite}"`)
        optionRegistry.set('opt', specificite, { id: idOpt })
      }
      const idAttribute = optionRegistry.get('opt', specificite).id

      const valKey = `${specificite}|${karazany}`
      if (!optionValueRegistry.has('val', valKey)) {
        const valXml = buildProductOptionValueXml(karazany, idAttribute)
        const valResp = await postXml('product_option_values', valXml)
        const idVal = extractIdFromResponse(valResp)
        if (!idVal) throw new Error(`ID option_value non récupéré pour "${karazany}"`)
        optionValueRegistry.set('val', valKey, { id: idVal })
      }
      const idOptionValue = optionValueRegistry.get('val', valKey).id

      const combiRef = `${ref}_${karazany}`
      const combXml = buildCombinationXml(idProduct, [idOptionValue], prixTTC, null, combiRef)
      const combResp = await postXml('combinations', combXml)
      const idCombination = extractIdFromResponse(combResp)
      if (!idCombination) throw new Error('ID combination non récupéré')

      // Stocker dans le registre : importStockRows s'en servira pour mettre à jour le stock
      registry.set('combinations', `${ref}|${karazany}`, { id: idCombination, idProduct })
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) await sleep(BATCH_DELAY_MS)
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import STOCK ─────────────────────────────────────────────────────────────
// Runs after combinations (importOrder 5 > 4).
// Lit le registre pour résoudre produits ET combinaisons, puis met à jour stock_availables.

const importStockRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  const getKarazany = (row) => {
    const k = Object.keys(row).find(k => k.toLowerCase() === 'karazany')
    return k ? (row[k] || '').trim() : ''
  }
  const getStockQty = (row) => {
    const k = Object.keys(row).find(k => {
      const n = k.toLowerCase().replace(/[^a-z0-9_]/g, '')
      return n === 'stock_initial' || n === 'stockinitial' || n === 'stock'
    })
    return k ? (row[k] || '').trim() : ''
  }

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const ref      = (row['reference'] || row['Reference'] || '').trim()
    const karazany = getKarazany(row)
    const stockQty = getStockQty(row)

    if (!stockQty) { results.skipped++; onProgress?.(Math.round(((i + 1) / total) * 100), results); continue }

    const productEntry = registry.get('products', ref)
    if (!productEntry?.id) {
      results.errors.push({ line: i + 2, message: `Produit "${ref}" introuvable dans le registre`, row })
      onProgress?.(Math.round(((i + 1) / total) * 100), results)
      continue
    }

    try {
      if (karazany) {
        // Déclinaison : récupérer l'ID combination depuis le registre
        const combEntry = registry.get('combinations', `${ref}|${karazany}`)
        if (!combEntry?.id) {
          results.errors.push({ line: i + 2, message: `Déclinaison "${ref}|${karazany}" introuvable dans le registre`, row })
          onProgress?.(Math.round(((i + 1) / total) * 100), results)
          continue
        }
        // Chercher le stock_available créé par PrestaShop pour cette combination
        const stockSearchResp = await axiosInstance.get(
          `/stock_availables?display=full&filter[id_product]=${productEntry.id}&filter[id_product_attribute]=${combEntry.id}`
        )
        const stockId = extractFieldFromResponse(stockSearchResp.data, 'stock_available id')
        if (!stockId) throw new Error(`stock_available introuvable pour ${ref}|${karazany}`)
        const xml = buildStockUpdateXml(stockId, productEntry.id, stockQty, combEntry.id)
        await putXml('stock_availables', stockId, xml)
      } else {
        // Produit simple : utiliser le stockAvailableId stocké lors de la création produit
        if (!productEntry.stockAvailableId) throw new Error(`stockAvailableId manquant pour "${ref}"`)
        const xml = buildStockUpdateXml(productEntry.stockAvailableId, productEntry.id, stockQty, '0')
        await putXml('stock_availables', productEntry.stockAvailableId, xml)
      }
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import CUSTOMERS ─────────────────────────────────────────────────────────
// Stocke registry.customers[email] = { id }
// Stocke registry.addresses[email] = { id } pour résolution dans les commandes

const importCustomerRows = async (rows, mapping, registry, onProgress) => {
  // Récupérer l'ID de France (ISO=FR) actif dans ce PS — ne pas hardcoder
  let importCountryId = '8'  // fallback PS8 standard
  try {
    const ctryResp = await axiosInstance.get('/countries?display=full&filter[active]=[1]&filter[iso_code]=[FR]')
    const ctryParsed = parseXML(ctryResp.data)
    const rawC = ctryParsed?.prestashop?.countries?.country
    const ctries = rawC ? (Array.isArray(rawC) ? rawC : [rawC]) : []
    const france = ctries.find(c => getVal(c.active) === '1') || ctries[0]
    if (france) importCountryId = getVal(france.id) || '8'
  } catch { /* fallback '8' */ }
  console.log('[Import] ID pays France :', importCountryId)

  const seen = new Map()
  for (const row of rows) {
    const key = MODULES_CONFIG.customers.registryKey(row)
    if (key && !seen.has(key)) seen.set(key, row)
  }
  const uniqueRows = [...seen.values()]
  const total = uniqueRows.length
  const results = { success: 0, errors: [], skipped: rows.length - total }

  for (let i = 0; i < total; i++) {
    const row = uniqueRows[i]
    const email = MODULES_CONFIG.customers.registryKey(row)
    try {
      const rawPwd = row['pwd'] || row['password'] || row['passwd'] || ''
      const hashedPwd = await md5(rawPwd)
      const customerXml = buildCustomerXml(row, hashedPwd)

      let idCustomer = null
      try {
        const resp = await postXml('customers', customerXml)
        // parseXML gère CDATA + warnings PHP, contrairement à DOMParser
        const custParsed = parseXML(resp)
        idCustomer = getVal(custParsed?.prestashop?.customer?.id) || ''
      } catch (postErr) {
        // Code PS 140 = email déjà utilisé → récupérer le client existant (upsert)
        const errData = String(postErr.response?.data || '')
        if (errData.includes('<errors>') && errData.includes('140')) {
          const findResp = await axiosInstance.get(
            `/customers?display=full&filter[email]=[${encodeURIComponent(email)}]`
          )
          const findParsed = parseXML(findResp.data)
          const raw = findParsed?.prestashop?.customers?.customer
          const first = Array.isArray(raw) ? raw[0] : raw
          idCustomer = getVal(first?.id) || ''
        } else {
          throw postErr
        }
      }
      if (!idCustomer) throw new Error('ID customer non récupéré')
      registry.set('customers', email, { id: idCustomer })

      const adresse = row['adresse'] || row['address'] || ''
      const nom = row['nom'] || row['name'] || ''
      // Toujours créer une nouvelle adresse depuis le CSV (pays actif = 72).
      // On ne réutilise pas les adresses PS existantes : elles peuvent avoir un pays
      // inactif si elles viennent d'imports précédents avec un mauvais id_country.
      if (adresse) {
        try {
          const addrXml = buildAddressXml(idCustomer, nom, adresse, importCountryId)
          const addrResp = await postXml('addresses', addrXml)
          const addrParsed = parseXML(addrResp)
          const idAddress = getVal(addrParsed?.prestashop?.address?.id) || ''
          if (idAddress) {
            registry.set('addresses', email, { id: idAddress })
            console.log('[Import] Adresse créée pour', email, '→ ID:', idAddress)
          } else {
            console.warn('[Import] ⚠ Adresse SANS ID pour', email,
              '— réponse PS:', String(addrResp || '').substring(0, 300))
          }
        } catch (addrErr) {
          console.warn('[Import] ⚠ Adresse EXCEPTION pour', email, ':',
            addrErr.response?.data ? String(addrErr.response.data).substring(0, 300) : addrErr.message)
        }
      }
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── MD5 ──────────────────────────────────────────────────────────────────────

const md5 = async (str) => md5Pure(str)

const md5Pure = (str) => {
  const safe_add = (x, y) => { const lsw = (x & 0xFFFF) + (y & 0xFFFF); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xFFFF) }
  const bit_rol = (num, cnt) => (num << cnt) | (num >>> (32 - cnt))
  const md5_cmn = (q, a, b, x, s, t) => safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
  const md5_ff = (a, b, c, d, x, s, t) => md5_cmn((b & c) | (~b & d), a, b, x, s, t)
  const md5_gg = (a, b, c, d, x, s, t) => md5_cmn((b & d) | (c & ~d), a, b, x, s, t)
  const md5_hh = (a, b, c, d, x, s, t) => md5_cmn(b ^ c ^ d, a, b, x, s, t)
  const md5_ii = (a, b, c, d, x, s, t) => md5_cmn(c ^ (b | ~d), a, b, x, s, t)
  const binl_md5 = (x, len) => {
    x[len >> 5] |= 0x80 << (len % 32); x[(((len + 64) >>> 9) << 4) + 14] = len
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d
      a = md5_ff(a,b,c,d,x[i],7,-680876936);d=md5_ff(d,a,b,c,x[i+1],12,-389564586);c=md5_ff(c,d,a,b,x[i+2],17,606105819);b=md5_ff(b,c,d,a,x[i+3],22,-1044525330)
      a=md5_ff(a,b,c,d,x[i+4],7,-176418897);d=md5_ff(d,a,b,c,x[i+5],12,1200080426);c=md5_ff(c,d,a,b,x[i+6],17,-1473231341);b=md5_ff(b,c,d,a,x[i+7],22,-45705983)
      a=md5_ff(a,b,c,d,x[i+8],7,1770035416);d=md5_ff(d,a,b,c,x[i+9],12,-1958414417);c=md5_ff(c,d,a,b,x[i+10],17,-42063);b=md5_ff(b,c,d,a,x[i+11],22,-1990404162)
      a=md5_ff(a,b,c,d,x[i+12],7,1804603682);d=md5_ff(d,a,b,c,x[i+13],12,-40341101);c=md5_ff(c,d,a,b,x[i+14],17,-1502002290);b=md5_ff(b,c,d,a,x[i+15],22,1236535329)
      a=md5_gg(a,b,c,d,x[i+1],5,-165796510);d=md5_gg(d,a,b,c,x[i+6],9,-1069501632);c=md5_gg(c,d,a,b,x[i+11],14,643717713);b=md5_gg(b,c,d,a,x[i],20,-373897302)
      a=md5_gg(a,b,c,d,x[i+5],5,-701558691);d=md5_gg(d,a,b,c,x[i+10],9,38016083);c=md5_gg(c,d,a,b,x[i+15],14,-660478335);b=md5_gg(b,c,d,a,x[i+4],20,-405537848)
      a=md5_gg(a,b,c,d,x[i+9],5,568446438);d=md5_gg(d,a,b,c,x[i+14],9,-1019803690);c=md5_gg(c,d,a,b,x[i+3],14,-187363961);b=md5_gg(b,c,d,a,x[i+8],20,1163531501)
      a=md5_gg(a,b,c,d,x[i+13],5,-1444681467);d=md5_gg(d,a,b,c,x[i+2],9,-51403784);c=md5_gg(c,d,a,b,x[i+7],14,1735328473);b=md5_gg(b,c,d,a,x[i+12],20,-1926607734)
      a=md5_hh(a,b,c,d,x[i+5],4,-378558);d=md5_hh(d,a,b,c,x[i+8],11,-2022574463);c=md5_hh(c,d,a,b,x[i+11],16,1839030562);b=md5_hh(b,c,d,a,x[i+14],23,-35309556)
      a=md5_hh(a,b,c,d,x[i+1],4,-1530992060);d=md5_hh(d,a,b,c,x[i+4],11,1272893353);c=md5_hh(c,d,a,b,x[i+7],16,-155497632);b=md5_hh(b,c,d,a,x[i+10],23,-1094730640)
      a=md5_hh(a,b,c,d,x[i+13],4,681279174);d=md5_hh(d,a,b,c,x[i],11,-358537222);c=md5_hh(c,d,a,b,x[i+3],16,-722521979);b=md5_hh(b,c,d,a,x[i+6],23,76029189)
      a=md5_hh(a,b,c,d,x[i+9],4,-640364487);d=md5_hh(d,a,b,c,x[i+12],11,-421815835);c=md5_hh(c,d,a,b,x[i+15],16,530742520);b=md5_hh(b,c,d,a,x[i+2],23,-995338651)
      a=md5_ii(a,b,c,d,x[i],6,-198630844);d=md5_ii(d,a,b,c,x[i+7],10,1126891415);c=md5_ii(c,d,a,b,x[i+14],15,-1416354905);b=md5_ii(b,c,d,a,x[i+5],21,-57434055)
      a=md5_ii(a,b,c,d,x[i+12],6,1700485571);d=md5_ii(d,a,b,c,x[i+3],10,-1894986606);c=md5_ii(c,d,a,b,x[i+10],15,-1051523);b=md5_ii(b,c,d,a,x[i+1],21,-2054922799)
      a=md5_ii(a,b,c,d,x[i+8],6,1873313359);d=md5_ii(d,a,b,c,x[i+15],10,-30611744);c=md5_ii(c,d,a,b,x[i+6],15,-1560198380);b=md5_ii(b,c,d,a,x[i+13],21,1309151649)
      a=md5_ii(a,b,c,d,x[i+4],6,-145523070);d=md5_ii(d,a,b,c,x[i+11],10,-1120210379);c=md5_ii(c,d,a,b,x[i+2],15,718787259);b=md5_ii(b,c,d,a,x[i+9],21,-343485551)
      a=safe_add(a,olda);b=safe_add(b,oldb);c=safe_add(c,oldc);d=safe_add(d,oldd)
    }
    return [a,b,c,d]
  }
  const binl2hex = (ba) => { const h='0123456789abcdef'; let s=''; for(let i=0;i<ba.length*4;i++){s+=h.charAt((ba[Math.floor(i/4)]>>((i%4)*8+4))&0xF)+h.charAt((ba[Math.floor(i/4)]>>((i%4)*8))&0xF)} return s }
  const str2binl = (str) => { const bin=[]; const mask=(1<<8)-1; for(let i=0;i<str.length*8;i+=8){bin[i>>5]|=(str.charCodeAt(i/8)&mask)<<(i%32)} return bin }
  return binl2hex(binl_md5(str2binl(str), str.length * 8))
}

// ─── XML customers + addresses ────────────────────────────────────────────────

const buildCustomerXml = (row, hashedPwd) => {
  const nom = row['nom'] || row['name'] || ''
  const email = row['email'] || row['Email'] || ''
  const parts = nom.trim().split(' ')
  const firstname = parts.length > 1 ? parts.slice(0, -1).join(' ') : nom
  const lastname = parts.length > 1 ? parts[parts.length - 1] : nom
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <email><![CDATA[${email}]]></email>
    <passwd>${hashedPwd}</passwd>
    <active>1</active>
    <id_default_group>3</id_default_group>
    <newsletter>0</newsletter>
    <optin>0</optin>
  </customer>
</prestashop>`
}

const buildAddressXml = (idCustomer, nom, adresse, countryId = '8') => {
  const parts = nom.trim().split(' ')
  const firstname = parts.length > 1 ? parts.slice(0, -1).join(' ') : nom
  const lastname = parts.length > 1 ? parts[parts.length - 1] : nom
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${idCustomer}</id_customer>
    <id_country>${countryId}</id_country>
    <alias>Mon adresse</alias>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <address1><![CDATA[${adresse}]]></address1>
    <city><![CDATA[${adresse}]]></city>
    <postcode>75000</postcode>
    <active>1</active>
  </address>
</prestashop>`
}

// ─── Import ORDERS — flux cart → order ───────────────────────────────────────
// etat vide → créer le panier seulement ("dans le panier")
// etat non-vide → créer panier + commande + changer état

const parseAchat = (achatStr) => {
  if (!achatStr) return []
  const items = []
  const regex = /\("([^"]+)";(\d+);"([^"]*)"\)/g
  let match
  while ((match = regex.exec(achatStr)) !== null) {
    items.push({ reference: match[1], quantity: parseInt(match[2], 10), variant: match[3] })
  }
  return items
}

const mapEtatToStateId = (etat) => {
  if (!etat || etat.trim() === '') return null  // null = panier seulement
  const e = etat.toLowerCase().trim()
  if (e.includes('accept') || e.includes('effectu') || e.includes('pay')) return '2'
  if (e.includes('annul') || e.includes('cancel')) return '6'
  return '2'
}

const buildImportCartXml = (idCustomer, idAddress, carrierId, currencyId, dateAdd) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${idCustomer}</id_customer>
    <id_address_delivery>${idAddress}</id_address_delivery>
    <id_address_invoice>${idAddress}</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${dateAdd}</date_add>
    <date_upd>${dateAdd}</date_upd>
  </cart>
</prestashop>`

const buildImportCartUpdateXml = (cartId, idCustomer, idAddress, carrierId, currencyId, secureKey, rowsXml, dateAdd) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <cart>
    <id>${cartId}</id>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${idCustomer}</id_customer>
    <id_address_delivery>${idAddress}</id_address_delivery>
    <id_address_invoice>${idAddress}</id_address_invoice>
    <id_carrier>${carrierId}</id_carrier>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <recyclable>0</recyclable>
    <gift>0</gift>
    <gift_message></gift_message>
    <mobile_theme>0</mobile_theme>
    <delivery_option></delivery_option>
    <allow_seperated_package>0</allow_seperated_package>
    <date_add>${dateAdd}</date_add>
    <date_upd>${dateAdd}</date_upd>
    <secure_key>${secureKey}</secure_key>
    <associations>
      <cart_rows nodeType="cart_row" api="cart_rows">
${rowsXml}
      </cart_rows>
    </associations>
  </cart>
</prestashop>`

const buildImportOrderXml = (idCustomer, idAddress, cartId, carrierId, currencyId, secureKey, dateAdd) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_address_delivery>${idAddress}</id_address_delivery>
    <id_address_invoice>${idAddress}</id_address_invoice>
    <id_cart>${cartId}</id_cart>
    <id_currency>${currencyId}</id_currency>
    <id_lang>1</id_lang>
    <id_customer>${idCustomer}</id_customer>
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
    <total_paid>0</total_paid>
    <total_paid_tax_incl>0</total_paid_tax_incl>
    <total_paid_tax_excl>0</total_paid_tax_excl>
    <total_paid_real>0</total_paid_real>
    <total_products>0</total_products>
    <total_products_wt>0</total_products_wt>
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
    <secure_key>${secureKey}</secure_key>
    <id_shop_group>1</id_shop_group>
    <id_shop>1</id_shop>
    <valid>1</valid>
    <date_add>${dateAdd}</date_add>
    <date_upd>${dateAdd}</date_upd>
    <invoice_date>0000-00-00 00:00:00</invoice_date>
    <invoice_number>0</invoice_number>
    <shipping_number></shipping_number>
  </order>
</prestashop>`

const importOrderRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  // Récupérer les valeurs par défaut une seule fois
  const getVal = (f) => {
    if (f === null || f === undefined) return ''
    if (typeof f === 'object') return String(f['#text'] ?? '')
    return String(f)
  }
  const toArr = (d) => !d ? [] : Array.isArray(d) ? d : [d]

  let defaultCarrierId = '1'
  let defaultCurrencyId = '1'

  try {
    const cResp = await axiosInstance.get('/carriers?display=full&filter[deleted]=[0]')
    const cParsed = parseXML(cResp.data)
    const carriers = toArr(cParsed?.prestashop?.carriers?.carrier)
      .filter(c => getVal(c.deleted) !== '1')

    // Les noms de transporteurs sont multilingues : { language: { '#text': '...' } }
    // getVal() ne remonte pas jusqu'à language → il faut lire explicitement
    const getCarrierName = (c) => {
      const n = c.name
      if (!n) return ''
      if (typeof n === 'string') return n
      if (typeof n !== 'object') return String(n)
      if ('#text' in n) return String(n['#text'])
      const lang = n.language
      if (!lang) return ''
      const first = Array.isArray(lang) ? lang[0] : lang
      return typeof first === 'object' ? String(first['#text'] || '') : String(first || '')
    }

    // Préférer le transporteur "Click & Collect" (compatible ps_cashondelivery)
    const click  = carriers.find(c => getCarrierName(c).toLowerCase().includes('click'))
    const active = carriers.find(c => getVal(c.active) === '1')
    const best   = click || active || carriers[0]
    if (best) defaultCarrierId = getVal(best.id) || '1'
    console.log('[Import] Transporteur sélectionné :', defaultCarrierId, '—', getCarrierName(best || {}))
  } catch { /* fallback '1' */ }

  try {
    const curResp = await axiosInstance.get('/currencies?display=full&filter[deleted]=0')
    const curParsed = parseXML(curResp.data)
    const currencies = toArr(curParsed?.prestashop?.currencies?.currency)
    const def = currencies.find(c => getVal(c.conversion_rate) === '1') || currencies[0]
    if (def) defaultCurrencyId = getVal(def.id) || '1'
  } catch { /* fallback '1' */ }

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const email    = row['email']  || row['Email']  || ''
    const achatStr = row['achat']  || row['Achat']  || ''
    const etat     = row['etat']   || row['Etat']   || ''
    const dateStr  = row['date']   || ''

    try {
      // 1. Résoudre client
      const customerEntry = registry.get('customers', email)
      if (!customerEntry?.id) throw new Error(`Client "${email}" non trouvé dans le registre`)
      const idCustomer = customerEntry.id

      // 2. Résoudre adresse (registre d'abord, fallback PS)
      let idAddress = null
      const addrEntry = registry.get('addresses', email)
      if (addrEntry?.id) {
        idAddress = addrEntry.id
        console.log('[Import] Adresse commande', email, '→ registre #', idAddress)
      } else {
        console.warn('[Import] ⚠ Adresse commande', email, '→ PAS dans registre, fallback PS')
        try {
          const addrResp = await axiosInstance.get(
            `/addresses?display=full&filter[id_customer]=[${idCustomer}]`
          )
          idAddress = extractFieldFromResponse(addrResp.data, 'address id')
          console.warn('[Import] Fallback adresse trouvée:', idAddress, '(peut avoir pays inactif!)')
        } catch { /* idAddress reste null → erreur levée ci-dessous */ }
      }
      if (!idAddress) throw new Error(`Adresse introuvable pour "${email}"`)

      // 3. Parser les articles
      const items = parseAchat(achatStr)
      if (items.length === 0) throw new Error('Aucun article dans la commande')

      // 4. Résoudre produits et combinaisons depuis le registre
      const resolvedItems = []
      for (const item of items) {
        const productEntry = registry.get('products', item.reference)
        if (!productEntry?.id) throw new Error(`Produit "${item.reference}" non trouvé dans le registre`)
        let idCombination = '0'
        if (item.variant) {
          const combEntry = registry.get('combinations', `${item.reference}|${item.variant}`)
          if (combEntry?.id) idCombination = combEntry.id
        }
        resolvedItems.push({ ...item, idProduct: productEntry.id, idCombination })
      }

      // 5. Convertir la date CSV (JJ/MM/AAAA → AAAA-MM-JJ HH:MM:SS)
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
      let dateAdd = now
      if (dateStr) {
        const parts = String(dateStr).split('/')
        if (parts.length === 3) dateAdd = `${parts[2]}-${parts[1]}-${parts[0]} 00:00:00`
      }

      // 6. Créer le panier
      const cartXml = buildImportCartXml(idCustomer, idAddress, defaultCarrierId, defaultCurrencyId, dateAdd)
      const cartRaw = await postXml('carts', cartXml)
      const cartParsed = parseXML(cartRaw)
      const cartId = getVal(cartParsed?.prestashop?.cart?.id) || ''
      if (!cartId || cartId === '0') throw new Error('ID panier non récupéré')

      // PS ne retourne pas secure_key dans la réponse POST → GET display=full pour l'obtenir
      const cartFullResp = await axiosInstance.get(`/carts/${cartId}?display=full`)
      const cartFullParsed = parseXML(cartFullResp.data)
      const cartSecureKey = getVal(cartFullParsed?.prestashop?.cart?.secure_key) || ''
      console.log('[Import] Cart', cartId, '— secure_key :', cartSecureKey ? '✓' : '⚠ toujours vide')

      // 7. Peupler le panier avec les lignes
      const cartRowsXml = resolvedItems.map(item =>
        `        <cart_row>
          <id_product>${item.idProduct}</id_product>
          <id_product_attribute>${item.idCombination}</id_product_attribute>
          <id_address_delivery>${idAddress}</id_address_delivery>
          <id_customization>0</id_customization>
          <quantity>${item.quantity}</quantity>
        </cart_row>`
      ).join('\n')

      const cartUpdateXml = buildImportCartUpdateXml(
        cartId, idCustomer, idAddress, defaultCarrierId, defaultCurrencyId, cartSecureKey, cartRowsXml, dateAdd
      )
      await putXml('carts', cartId, cartUpdateXml)

      // 8. Si etat non-vide : créer la commande puis changer l'état
      const stateId = mapEtatToStateId(etat)
      if (stateId !== null) {
        const orderXml = buildImportOrderXml(
          idCustomer, idAddress, cartId, defaultCarrierId, defaultCurrencyId, cartSecureKey, dateAdd
        )
        let orderId = ''
        try {
          const orderRaw = await postXml('orders', orderXml)
          const orderParsed = parseXML(orderRaw)
          const raw = orderParsed?.prestashop?.order?.id
          orderId = raw && typeof raw === 'object' ? String(raw['#text'] || '') : String(raw || '')
        } catch (err) {
          const errData = String(err.response?.data || '')
          // Le module gamification utilise un hook déprécié ("newOrder") qui fait échouer
          // la réponse WS MAIS la commande est déjà committée en DB avant les hooks.
          // On la retrouve via son id_cart.
          if (errData.includes('gamification') || errData.includes('deprecated') || errData.includes('code><![CDATA[15]]>')) {
            console.warn('[Import] Erreur hook gamification (non-bloquante), recherche commande par cart', cartId)
            try {
              const findResp = await axiosInstance.get(`/orders?display=full&filter[id_cart]=[${cartId}]`)
              const findParsed = parseXML(findResp.data)
              const rawOrders = findParsed?.prestashop?.orders?.order
              const found = rawOrders ? (Array.isArray(rawOrders) ? rawOrders[0] : rawOrders) : null
              orderId = found ? getVal(found.id) : ''
              if (orderId) console.log('[Import] Commande #' + orderId + ' récupérée malgré erreur gamification')
            } catch { /* orderId reste vide → erreur en dessous */ }
          } else {
            console.error('Order creation error (import):', errData)
            throw err
          }
        }
        if (!orderId || orderId === '0') {
          throw new Error('ID commande non récupéré depuis PrestaShop')
        }
        // Petit délai pour que PS finisse le traitement avant le GET /orders/{id}
        await sleep(600)
        // Changer l'état — si le GET retourne du non-XML (PS encore en traitement),
        // on log l'avertissement mais la commande est quand même comptée comme succès
        try {
          await updateOrderState(orderId, stateId)
        } catch (stateErr) {
          console.warn(`Import: état ${stateId} non appliqué pour commande #${orderId}:`, stateErr.message)
        }
      }

      results.success++
    } catch (err) {
      // Montrer le corps de réponse PS si disponible (plus utile que le message axios générique)
      const psBody = err.response?.data
      const msg = psBody
        ? (typeof psBody === 'string' ? psBody.slice(0, 500) : JSON.stringify(psBody).slice(0, 500))
        : err.message
      results.errors.push({ line: i + 2, message: msg, row })
    }
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── Import IMAGES (ZIP) ──────────────────────────────────────────────────────
// Nom du fichier dans le ZIP = référence produit (ex: T_01.jpg)
// Upload vers POST /images/products/{idProduct}

const importImages = async (zipFile, registry, onProgress) => {
  const results = { success: 0, errors: [] }
  try {
    const zip = await JSZip.loadAsync(zipFile)
    const imageFiles = Object.values(zip.files).filter(f => {
      const name = f.name.split('/').pop()
      return !f.dir &&
        /\.(jpe?g|png|gif|webp)$/i.test(name) &&
        !name.startsWith('._') &&   // fichiers de métadonnées macOS
        !name.startsWith('__MACOSX') // dossier macOS
    })
    const total = imageFiles.length
    if (total === 0) return results

    for (let i = 0; i < total; i++) {
      const zipEntry = imageFiles[i]
      const filename = zipEntry.name.split('/').pop()
      const reference = filename.replace(/\.[^.]+$/, '')

      const productEntry = registry.get('products', reference)
      if (!productEntry?.id) {
        results.errors.push({
          line: i + 1,
          message: `Produit "${reference}" introuvable dans le registre`,
          row: { filename },
        })
        onProgress?.(Math.round(((i + 1) / total) * 100), results)
        continue
      }

      try {
        const blob = await zipEntry.async('blob')
        const formData = new FormData()
        formData.append('image', blob, filename)
        await axiosInstance.post(`/images/products/${productEntry.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        results.success++
      } catch (err) {
        results.errors.push({
          line: i + 1,
          message: err.response?.data || err.message,
          row: { filename },
        })
      }
      onProgress?.(Math.round(((i + 1) / total) * 100), results)
    }
  } catch (err) {
    results.errors.push({ line: 0, message: `Erreur ZIP : ${err.message}`, row: {} })
  }
  return results
}

// ─── Routeur principal par module ─────────────────────────────────────────────

const MODULE_IMPORTERS = {
  taxes:        importTaxRows,
  categories:   importCategoryRows,
  products:     importProductRows,
  combinations: importCombinationRows,
  stock:        importStockRows,
  customers:    importCustomerRows,
  orders:       importOrderRows,
}

export const importModuleRows = async (rows, moduleKey, mapping, registry, onProgress) => {
  const importer = MODULE_IMPORTERS[moduleKey]
  if (!importer) return importGenericRows(rows, moduleKey, mapping, registry, onProgress)
  return importer(rows, mapping, registry, onProgress)
}

const importGenericRows = async (rows, moduleKey, mapping, registry, onProgress) => {
  const config = MODULES_CONFIG[moduleKey]
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }
  for (let i = 0; i < total; i++) {
    const row = rows[i]
    try {
      const xml = buildXmlFromMapping(row, moduleKey, mapping, registry)
      await postXml(config.apiEndpoint, xml)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) await sleep(BATCH_DELAY_MS)
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }
  return results
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Lance l'import multi-fichiers avec un registre partagé.
 * csvPlan : [{ moduleKey, rows, mapping }] — tous les modules CSV de tous les fichiers
 * zipFile : File (ZIP d'images) ou null
 */
export const importMultiModule = async (csvPlan, zipFile, onModuleProgress, onModuleDone) => {
  const registry = new ImportRegistry()
  const globalReport = {}

  // Trier tous les modules CSV par importOrder global
  const sorted = [...csvPlan].sort(
    (a, b) => (MODULES_CONFIG[a.moduleKey]?.importOrder ?? 99) - (MODULES_CONFIG[b.moduleKey]?.importOrder ?? 99)
  )

  for (const { moduleKey, rows, mapping } of sorted) {

    const results = await importModuleRows(
      rows, moduleKey, mapping, registry,
      (pct, partial) => onModuleProgress?.(moduleKey, pct, partial)
    )
    globalReport[moduleKey] = results
    onModuleDone?.(moduleKey, results)
  }

  // Images en dernier (produits déjà dans le registre)
  if (zipFile) {
    const imageResults = await importImages(
      zipFile, registry,
      (pct, partial) => onModuleProgress?.('images', pct, partial)
    )
    globalReport['images'] = imageResults
    onModuleDone?.('images', imageResults)
  }

  return globalReport
}
