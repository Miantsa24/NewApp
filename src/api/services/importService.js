// src/api/services/importService.js

import Papa from 'papaparse'
import axiosInstance from '../axiosInstance'
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

const extractStockAvailableIdFromProductResponse = (responseData) => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(responseData, 'application/xml')
    // PrestaShop retourne dans associations/stock_availables/stock_available/id
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
        if (count > bestCount) {
          bestCount = count
          bestSep = sep
        }
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

// ─── POST générique ───────────────────────────────────────────────────────────

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

// ─── Import TAXES (chaîne 3 appels) ──────────────────────────────────────────
// Pour chaque taux unique : POST tax → POST tax_rules_group → POST tax_rule
// Stocke dans registry.taxes[taux] = { id: idTax, taxRulesGroupId }

const importTaxRows = async (rows, mapping, registry, onProgress) => {
  // Dédupliquer par taux
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
      // Étape 1 : POST /taxes
      const taxXml = buildXmlFromMapping(row, 'taxes', mapping)
      const taxResp = await postXml('taxes', taxXml)
      const idTax = extractIdFromResponse(taxResp)
      if (!idTax) throw new Error('ID tax non récupéré depuis PrestaShop')

      // Étape 2 : POST /tax_rules_groups
      const rateVal = taxKey // ex: "11.65"
      // Étape 2 : POST /tax_rule_groups  ← sans s
const groupXml = buildTaxRulesGroupXml(`TVA ${rateVal}%`)
const groupResp = await postXml('tax_rule_groups', groupXml)  // ← sans s
      const idGroup = extractIdFromResponse(groupResp)
      if (!idGroup) throw new Error('ID tax_rules_group non récupéré')

      // Étape 3 : POST /tax_rules
      const ruleXml = buildTaxRuleXml(idGroup, idTax)
      await postXml('tax_rules', ruleXml)

      // Stocker dans le registre
      registry.set('taxes', taxKey, { id: idTax, taxRulesGroupId: idGroup })
      results.success++
    } catch (err) {
      results.errors.push({
        line: i + 2,
        message: err.response?.data || err.message,
        row,
      })
    }

    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }

  return results
}

// ─── Import CATEGORIES ────────────────────────────────────────────────────────
// Déduplique par nom, POST chaque catégorie unique
// Stocke registry.categories[nom] = { id }

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
// Stocke registry.products[reference] = { id, stockAvailableId }

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

// ─── Import COMBINATIONS (product_options → option_values → combinations) ────
// Fichier 2 : reference, specificité, karazany, stock_initial, prix_vente_ttc

const importCombinationRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  // Registres locaux pour options et valeurs
  const optionRegistry = new ImportRegistry()   // { "taille" → { id } }
  const optionValueRegistry = new ImportRegistry() // { "taille|ngoza" → { id } }

  // Récupérer la clé de colonne spécificité et karazany
  const getSpecKey = (row) => {
    const k = Object.keys(row).find(k => {
      const n = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '')
      return n === 'specificite' || n === 'specificite'
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
  const getStockKey = (row) => {
    const k = Object.keys(row).find(k => {
      const n = k.toLowerCase().replace(/[^a-z0-9_]/g, '')
      return n === 'stock_initial' || n === 'stockinitial' || n === 'stock'
    })
    return k ? row[k] : ''
  }

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const ref = row['reference'] || row['Reference'] || ''
    const specificite = getSpecKey(row)
    const karazany = getValKey(row)
    const prixTTC = getPrixKey(row)
    const stockQty = getStockKey(row)

    // Récupérer le produit parent depuis le registre
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
      // Si pas de spécificité → produit simple sans déclinaison, juste mettre à jour le stock
      if (!specificite || !karazany) {
        if (stockQty && productEntry.stockAvailableId) {
          const stockXml = buildStockUpdateXml(
            productEntry.stockAvailableId,
            idProduct,
            stockQty,
            '0'
          )
          await putXml('stock_availables', productEntry.stockAvailableId, stockXml)
        }
        results.success++
        onProgress?.(Math.round(((i + 1) / total) * 100), results)
        continue
      }

      // Étape 1 : Créer product_option si pas encore fait
      if (!optionRegistry.has('opt', specificite)) {
        const optXml = buildProductOptionXml(specificite)
        const optResp = await postXml('product_options', optXml)
        const idOpt = extractIdFromResponse(optResp)
        if (!idOpt) throw new Error(`ID product_option non récupéré pour "${specificite}"`)
        optionRegistry.set('opt', specificite, { id: idOpt })
      }
      const idAttribute = optionRegistry.get('opt', specificite).id

      // Étape 2 : Créer product_option_value si pas encore fait
      const valKey = `${specificite}|${karazany}`
      if (!optionValueRegistry.has('val', valKey)) {
        const valXml = buildProductOptionValueXml(karazany, idAttribute)
        const valResp = await postXml('product_option_values', valXml)
        const idVal = extractIdFromResponse(valResp)
        if (!idVal) throw new Error(`ID option_value non récupéré pour "${karazany}"`)
        optionValueRegistry.set('val', valKey, { id: idVal })
      }
      const idOptionValue = optionValueRegistry.get('val', valKey).id

      // Récupérer le taux de taxe depuis le registre (via le produit parent)
      // On cherche la ligne produit correspondante pour avoir son taux
      let taxRate = null
      // On n'a pas besoin du taux exact pour le prix impact si on stocke le prix TTC de la combinaison
      // Pour l'impact prix : prix combinaison HT - prix produit HT
      // Ici on stocke juste le prix TTC et on laisse PrestaShop gérer
      // → on met l'impact à 0 si on ne peut pas calculer, le stock_available sera mis à jour
      const combiRef = `${ref}_${karazany}`

      // Étape 3 : Créer la combination
      const combXml = buildCombinationXml(idProduct, [idOptionValue], prixTTC, taxRate, combiRef)
      const combResp = await postXml('combinations', combXml)
      const idCombination = extractIdFromResponse(combResp)
      if (!idCombination) throw new Error('ID combination non récupéré')

      // Stocker dans registre global
      registry.set('combinations', `${ref}|${karazany}`, { id: idCombination, idProduct })

      // Étape 4 : Mettre à jour le stock de la combination
      // PrestaShop crée automatiquement un stock_available pour chaque combination
      // Il faut récupérer son ID via GET stock_availables?filter[id_product]=X&filter[id_product_attribute]=Y
      if (stockQty) {
        try {
          const stockSearchResp = await axiosInstance.get(
            `/stock_availables?filter[id_product]=${idProduct}&filter[id_product_attribute]=${idCombination}&display=full`
          )
          const stockDoc = new DOMParser().parseFromString(stockSearchResp.data, 'application/xml')
          const stockId = stockDoc.querySelector('stock_available id')?.textContent?.trim()
          if (stockId) {
            const stockXml = buildStockUpdateXml(stockId, idProduct, stockQty, idCombination)
            await putXml('stock_availables', stockId, stockXml)
          }
        } catch (stockErr) {
          // Non bloquant : la combination est créée, le stock sera à 0
          console.warn(`Stock non mis à jour pour combination ${combiRef}:`, stockErr.message)
        }
      }

      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }

    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < total) await sleep(BATCH_DELAY_MS)
    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }

  return results
}

// ─── Import CUSTOMERS ─────────────────────────────────────────────────────────
// Stocke registry.customers[email] = { id }
// Crée aussi l'adresse depuis la colonne 'adresse'

const importCustomerRows = async (rows, mapping, registry, onProgress) => {
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
      // Hash MD5 du mot de passe (PrestaShop attend MD5)
      const rawPwd = row['pwd'] || row['password'] || row['passwd'] || ''
      const hashedPwd = await md5(rawPwd)

      const customerXml = buildCustomerXml(row, hashedPwd)
      const resp = await postXml('customers', customerXml)
      const idCustomer = extractIdFromResponse(resp)
      if (!idCustomer) throw new Error('ID customer non récupéré')

      registry.set('customers', email, { id: idCustomer })

      // Créer l'adresse si colonne 'adresse' présente
      const adresse = row['adresse'] || row['address'] || ''
      const nom = row['nom'] || row['name'] || ''
      if (adresse && idCustomer) {
        try {
          const addrXml = buildAddressXml(idCustomer, nom, adresse)
          await postXml('addresses', addrXml)
        } catch (addrErr) {
          console.warn(`Adresse non créée pour ${email}:`, addrErr.message)
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

// MD5 natif via Web Crypto
const md5 = async (str) => {
  // PrestaShop utilise MD5 — Web Crypto ne supporte pas MD5
  // On utilise une implémentation JS pure légère
  return md5Pure(str)
}

const md5Pure = (str) => {
  // Implémentation MD5 pure JS (RFC 1321)
  const safe_add = (x, y) => {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xFFFF)
  }
  const bit_rol = (num, cnt) => (num << cnt) | (num >>> (32 - cnt))
  const md5_cmn = (q, a, b, x, s, t) => safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
  const md5_ff = (a, b, c, d, x, s, t) => md5_cmn((b & c) | (~b & d), a, b, x, s, t)
  const md5_gg = (a, b, c, d, x, s, t) => md5_cmn((b & d) | (c & ~d), a, b, x, s, t)
  const md5_hh = (a, b, c, d, x, s, t) => md5_cmn(b ^ c ^ d, a, b, x, s, t)
  const md5_ii = (a, b, c, d, x, s, t) => md5_cmn(c ^ (b | ~d), a, b, x, s, t)

  const binl_md5 = (x, len) => {
    x[len >> 5] |= 0x80 << (len % 32)
    x[(((len + 64) >>> 9) << 4) + 14] = len
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d
      a = md5_ff(a, b, c, d, x[i], 7, -680876936); d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586); c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330)
      a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426); c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983)
      a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417); c = md5_ff(c, d, a, b, x[i + 10], 17, -42063); b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162)
      a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101); c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329)
      a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632); c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5_gg(b, c, d, a, x[i], 20, -373897302)
      a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083); c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848)
      a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690); c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501)
      a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784); c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473); b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734)
      a = md5_hh(a, b, c, d, x[i + 5], 4, -378558); d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463); c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556)
      a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353); c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640)
      a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5_hh(d, a, b, c, x[i], 11, -358537222); c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189)
      a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835); c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651)
      a = md5_ii(a, b, c, d, x[i], 6, -198630844); d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415); c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055)
      a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606); c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799)
      a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744); c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649)
      a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379); c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551)
      a = safe_add(a, olda); b = safe_add(b, oldb); c = safe_add(c, oldc); d = safe_add(d, oldd)
    }
    return [a, b, c, d]
  }

  const binl2hex = (binarray) => {
    const hex_tab = '0123456789abcdef'
    let str = ''
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hex_tab.charAt((binarray[Math.floor(i / 4)] >> ((i % 4) * 8 + 4)) & 0xF) +
             hex_tab.charAt((binarray[Math.floor(i / 4)] >> ((i % 4) * 8)) & 0xF)
    }
    return str
  }

  const str2binl = (str) => {
    const bin = []
    const mask = (1 << 8) - 1
    for (let i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32)
    }
    return bin
  }

  return binl2hex(binl_md5(str2binl(str), str.length * 8))
}

// ─── XML customers + addresses ────────────────────────────────────────────────

const buildCustomerXml = (row, hashedPwd) => {
  const nom = row['nom'] || row['name'] || ''
  const email = row['email'] || row['Email'] || ''
  // Séparer nom en firstname/lastname (on met tout en lastname si pas de prénom)
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

const buildAddressXml = (idCustomer, nom, adresse) => {
  const parts = nom.trim().split(' ')
  const firstname = parts.length > 1 ? parts.slice(0, -1).join(' ') : nom
  const lastname = parts.length > 1 ? parts[parts.length - 1] : nom

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <address>
    <id_customer>${idCustomer}</id_customer>
    <id_country>87</id_country>
    <alias>Mon adresse</alias>
    <firstname><![CDATA[${firstname}]]></firstname>
    <lastname><![CDATA[${lastname}]]></lastname>
    <address1><![CDATA[${adresse}]]></address1>
    <city><![CDATA[${adresse}]]></city>
    <postcode>101</postcode>
    <active>1</active>
  </address>
</prestashop>`
}

// ─── Import ORDERS ────────────────────────────────────────────────────────────
// Format achat : [("T_01";3;"ngoza"),("C_03";1;"")]
// etat : "" → current_state 1 (en attente), "paiement accepté" → 2

const parseAchat = (achatStr) => {
  if (!achatStr) return []
  const items = []
  // Nettoyer : [(""T_01"";3;""ngoza"")]  → extraire les triplets
  const regex = /\("([^"]+)";(\d+);"([^"]*)"\)/g
  let match
  while ((match = regex.exec(achatStr)) !== null) {
    items.push({ reference: match[1], quantity: parseInt(match[2], 10), variant: match[3] })
  }
  return items
}

const mapEtatToState = (etat) => {
  if (!etat || etat.trim() === '') return '1'  // En attente de paiement
  const e = etat.toLowerCase().trim()
  if (e.includes('accept') || e.includes('effectu') || e.includes('pay')) return '2'
  if (e.includes('annul') || e.includes('cancel')) return '6'
  return '1'
}

const importOrderRows = async (rows, mapping, registry, onProgress) => {
  const total = rows.length
  const results = { success: 0, errors: [], skipped: 0 }

  // Récupérer les IDs de devise et langue par défaut
  const ID_CURRENCY = '1'
  const ID_LANG = '1'
  const ID_CARRIER = '1'
  const ID_ADDRESS = '1'  // sera récupéré dynamiquement si possible

  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const email = row['email'] || row['Email'] || ''
    const achatStr = row['achat'] || row['Achat'] || ''
    const etat = row['etat'] || row['Etat'] || ''

    try {
      // Récupérer id_customer depuis le registre
      const customerEntry = registry.get('customers', email)
      if (!customerEntry?.id) throw new Error(`Client "${email}" non trouvé dans le registre`)
      const idCustomer = customerEntry.id

      // Parser les articles
      const items = parseAchat(achatStr)
      if (items.length === 0) throw new Error('Aucun article dans la commande')

      // Calculer le total depuis les produits
      let totalPaid = 0
      const orderRows = []
      for (const item of items) {
        const productEntry = registry.get('products', item.reference)
        if (!productEntry?.id) throw new Error(`Produit "${item.reference}" non trouvé`)

        // Récupérer le prix depuis le registre des combinations si variante
        let unitPrice = 0
        if (item.variant) {
          const combEntry = registry.get('combinations', `${item.reference}|${item.variant}`)
          // Prix de la combinaison — on utilise le prix produit par défaut
          unitPrice = 0 // sera calculé depuis le produit
        }
        totalPaid += unitPrice * item.quantity
        orderRows.push({ ...item, idProduct: productEntry.id, unitPrice })
      }

      const currentState = mapEtatToState(etat)

      // Récupérer l'adresse du client
      let idAddress = '1'
      try {
        const addrResp = await axiosInstance.get(`/addresses?filter[id_customer]=${idCustomer}&display=full`)
        const addrDoc = new DOMParser().parseFromString(addrResp.data, 'application/xml')
        const addrId = addrDoc.querySelector('address id')?.textContent?.trim()
        if (addrId) idAddress = addrId
      } catch { /* fallback id 1 */ }

      const orderXml = buildOrderXml(idCustomer, idAddress, currentState, orderRows, ID_CURRENCY, ID_LANG, ID_CARRIER)
      await postXml('orders', orderXml)
      results.success++
    } catch (err) {
      results.errors.push({ line: i + 2, message: err.response?.data || err.message, row })
    }

    onProgress?.(Math.round(((i + 1) / total) * 100), results)
  }

  return results
}

const buildOrderXml = (idCustomer, idAddress, currentState, items, idCurrency, idLang, idCarrier) => {
  const orderRows = items.map(item => `
      <order_row>
        <id_product>${item.idProduct}</id_product>
        <product_quantity>${item.quantity}</product_quantity>
        <product_price>0.000000</product_price>
        <unit_price_tax_incl>0.000000</unit_price_tax_incl>
        <unit_price_tax_excl>0.000000</unit_price_tax_excl>
      </order_row>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order>
    <id_customer>${idCustomer}</id_customer>
    <id_address_delivery>${idAddress}</id_address_delivery>
    <id_address_invoice>${idAddress}</id_address_invoice>
    <id_currency>${idCurrency}</id_currency>
    <id_lang>${idLang}</id_lang>
    <id_carrier>${idCarrier}</id_carrier>
    <current_state>${currentState}</current_state>
    <payment>Paiement à la livraison</payment>
    <module>ps_cashondelivery</module>
    <total_paid>0.000000</total_paid>
    <total_paid_real>0.000000</total_paid_real>
    <total_products>0.000000</total_products>
    <total_products_wt>0.000000</total_products_wt>
    <total_shipping>0.000000</total_shipping>
    <total_shipping_tax_incl>0.000000</total_shipping_tax_incl>
    <total_shipping_tax_excl>0.000000</total_shipping_tax_excl>
    <conversion_rate>1.000000</conversion_rate>
    <associations>
      <order_rows>${orderRows}
      </order_rows>
    </associations>
  </order>
</prestashop>`
}

// ─── Routeur principal par module ─────────────────────────────────────────────

const MODULE_IMPORTERS = {
  taxes:        importTaxRows,
  categories:   importCategoryRows,
  products:     importProductRows,
  combinations: importCombinationRows,
  stock:        importCombinationRows,  // géré dans combinations
  customers:    importCustomerRows,
  orders:       importOrderRows,
}

// ─── API publique ─────────────────────────────────────────────────────────────

export const importModuleRows = async (rows, moduleKey, mapping, registry, onProgress) => {
  const importer = MODULE_IMPORTERS[moduleKey]
  if (!importer) {
    // Module sans importeur spécialisé : import générique
    return importGenericRows(rows, moduleKey, mapping, registry, onProgress)
  }
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

export const importMultiModule = async (modulePlan, onModuleProgress, onModuleDone) => {
  // Un seul registre partagé pour tous les modules du même fichier
  const registry = new ImportRegistry()
  const globalReport = {}

  // Trier par importOrder (taxes → categories → products → combinations → customers → orders)
  const sorted = [...modulePlan].sort(
    (a, b) => (MODULES_CONFIG[a.moduleKey]?.importOrder ?? 99) - (MODULES_CONFIG[b.moduleKey]?.importOrder ?? 99)
  )

  for (const { moduleKey, rows, mapping } of sorted) {
    // Le module stock est géré dans combinations — on saute si les deux sont présents
    if (moduleKey === 'stock' && sorted.some(p => p.moduleKey === 'combinations')) continue

    const results = await importModuleRows(
      rows,
      moduleKey,
      mapping,
      registry,
      (pct, partial) => onModuleProgress?.(moduleKey, pct, partial)
    )
    globalReport[moduleKey] = results
    onModuleDone?.(moduleKey, results)
  }

  return globalReport
}

// Garde la compatibilité avec l'ancien appel depuis ImportPage
export const importCsv = async (rows, moduleKey, onProgress) => {
  const registry = new ImportRegistry()
  return importModuleRows(rows, moduleKey, null, registry, onProgress)
}