// Mapping des colonnes CSV vers les champs XML PrestaShop par module
import md5 from 'md5'

// Champs qui nécessitent un hash MD5
const MD5_FIELDS = ['passwd']

const FIELD_MAPS = {
  products: {
    'Name *':                   'name',
    'Price tax excluded':       'price',
    'Active (0/1)':             'active',
    'Reference #':              'reference',
    'Description':              'description',
    'Summary':                  'description_short',
    'Wholesale price':          'wholesale_price',
    'On sale (0/1)':            'on_sale',
    'EAN13':                    'ean13',
    'UPC':                      'upc',
    'Width':                    'width',
    'Height':                   'height',
    'Depth':                    'depth',
    'Weight':                   'weight',
    'Quantity':                 'quantity',
    'Minimal quantity':         'minimal_quantity',
    'Visibility':               'visibility',
    'Condition':                'condition',
    'Available for order (0 = No, 1 = Yes)': 'available_for_order',
    'Show price (0 = No, 1 = Yes)':          'show_price',
    'Tax rules ID':             'id_tax_rules_group',
    'Meta title':               'meta_title',
    'Meta keywords':            'meta_keywords',
    'Meta description':         'meta_description',
    'URL rewritten':            'link_rewrite',
  },
  customers: {
    'Last Name *':          'lastname',
    'First Name *':         'firstname',
    'Email *':              'email',
    'Active (0/1)':         'active',
    'Password *':           'passwd',
    'Birthday (yyyy-mm-dd)':'birthday',
    'Titles ID (Mr = 1, Ms = 2, else 0)': 'id_gender',
    'Newsletter (0/1)':     'newsletter',
    'Opt-in (0/1)':         'optin',
    'Default group ID':     'id_default_group',
  },
  orders: {
    'Total paid *':       'total_paid',
    'Payment *':          'payment',
    'Customer ID *':      'id_customer',
    'Currency ID *':      'id_currency',
    'Language ID *':      'id_lang',
  }
}

// Champs multilingues qui doivent être wrappés avec <language id="1">
const MULTILANG_FIELDS = [
  'name', 'description', 'description_short',
  'meta_title', 'meta_keywords', 'meta_description', 'link_rewrite'
]

// Échappe les caractères spéciaux XML
const escapeXml = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Convertit un objet row CSV en XML PrestaShop
export const rowToXml = (row, module) => {
  const fieldMap = FIELD_MAPS[module]
  if (!fieldMap) throw new Error(`Module inconnu : ${module}`)

  const tag = module.slice(0, -1)
  let xmlFields = ''

  for (const [csvCol, xmlField] of Object.entries(fieldMap)) {
    const value = row[csvCol]
    if (value === undefined || value === '') continue

    let finalValue = value

    // Hash MD5 si nécessaire
    if (MD5_FIELDS.includes(xmlField)) {
      finalValue = md5(value)
    }

    if (MULTILANG_FIELDS.includes(xmlField)) {
      xmlFields += `
        <${xmlField}>
          <language id="1"><![CDATA[${finalValue}]]></language>
        </${xmlField}>`
    } else {
      xmlFields += `
        <${xmlField}>${escapeXml(finalValue)}</${xmlField}>`
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <${tag}>
    ${xmlFields}
  </${tag}>
</prestashop>`
}