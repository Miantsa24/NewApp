export const MODULES_CONFIG = {
  products: {
    label: 'Produits',
    apiEndpoint: 'products',
    xmlTag: 'product',
    multilingualFields: [
      'name', 'description', 'description_short',
      'meta_title', 'meta_keywords', 'meta_description', 'link_rewrite'
    ],
    md5Fields: [],
    requiredFields: [
      { csv: 'Name *',               xml: 'name',          desc: 'Nom du produit' },
      { csv: 'Price tax excluded',   xml: 'price',         desc: 'Prix HT' },
      { csv: 'Active (0/1)',         xml: 'active',        desc: 'Produit actif' },
    ],
    optionalFields: [
      { csv: 'Reference #',          xml: 'reference',         desc: 'Référence' },
      { csv: 'Description',          xml: 'description',       desc: 'Description longue' },
      { csv: 'Summary',              xml: 'description_short', desc: 'Description courte' },
      { csv: 'Wholesale price',      xml: 'wholesale_price',   desc: 'Prix grossiste' },
      { csv: 'On sale (0/1)',        xml: 'on_sale',           desc: 'En promotion' },
      { csv: 'EAN13',                xml: 'ean13',             desc: 'Code EAN13' },
      { csv: 'UPC',                  xml: 'upc',               desc: 'Code UPC' },
      { csv: 'Width',                xml: 'width',             desc: 'Largeur' },
      { csv: 'Height',               xml: 'height',            desc: 'Hauteur' },
      { csv: 'Depth',                xml: 'depth',             desc: 'Profondeur' },
      { csv: 'Weight',               xml: 'weight',            desc: 'Poids' },
      { csv: 'Quantity',             xml: 'quantity',          desc: 'Quantité en stock' },
      { csv: 'Minimal quantity',     xml: 'minimal_quantity',  desc: 'Quantité minimale' },
      { csv: 'Visibility',           xml: 'visibility',        desc: 'Visibilité' },
      { csv: 'Condition',            xml: 'condition',         desc: 'État (new/used...)' },
      { csv: 'Available for order (0 = No, 1 = Yes)', xml: 'available_for_order', desc: 'Disponible à la commande' },
      { csv: 'Show price (0 = No, 1 = Yes)',          xml: 'show_price',          desc: 'Afficher le prix' },
      { csv: 'Tax rules ID',         xml: 'id_tax_rules_group', desc: 'Règle de taxe' },
      { csv: 'Meta title',           xml: 'meta_title',        desc: 'Titre SEO' },
      { csv: 'Meta keywords',        xml: 'meta_keywords',     desc: 'Mots-clés SEO' },
      { csv: 'Meta description',     xml: 'meta_description',  desc: 'Description SEO' },
      { csv: 'URL rewritten',        xml: 'link_rewrite',      desc: 'URL simplifiée' },
    ],
  },

  customers: {
    label: 'Clients',
    apiEndpoint: 'customers',
    xmlTag: 'customer',
    multilingualFields: [],
    md5Fields: ['passwd'],
    requiredFields: [
      { csv: 'Last Name *',   xml: 'lastname',  desc: 'Nom de famille' },
      { csv: 'First Name *',  xml: 'firstname', desc: 'Prénom' },
      { csv: 'Email *',       xml: 'email',     desc: 'Adresse email' },
      { csv: 'Password *',    xml: 'passwd',    desc: 'Mot de passe (hashé MD5)' },
    ],
    optionalFields: [
      { csv: 'Active (0/1)',                          xml: 'active',           desc: 'Compte actif' },
      { csv: 'Birthday (yyyy-mm-dd)',                 xml: 'birthday',         desc: 'Date de naissance' },
      { csv: 'Titles ID (Mr = 1, Ms = 2, else 0)',   xml: 'id_gender',        desc: 'Civilité' },
      { csv: 'Newsletter (0/1)',                      xml: 'newsletter',       desc: 'Abonné newsletter' },
      { csv: 'Opt-in (0/1)',                          xml: 'optin',            desc: 'Opt-in partenaires' },
      { csv: 'Default group ID',                      xml: 'id_default_group', desc: 'Groupe par défaut' },
    ],
  },

  orders: {
    label: 'Commandes',
    apiEndpoint: 'orders',
    xmlTag: 'order',
    multilingualFields: [],
    md5Fields: [],
    requiredFields: [
      { csv: 'Total paid *',    xml: 'total_paid',   desc: 'Total payé' },
      { csv: 'Payment *',       xml: 'payment',      desc: 'Mode de paiement' },
      { csv: 'Customer ID *',   xml: 'id_customer',  desc: 'ID du client' },
    ],
    optionalFields: [
      { csv: 'Currency ID *',   xml: 'id_currency',  desc: 'ID de la devise' },
      { csv: 'Language ID *',   xml: 'id_lang',      desc: 'ID de la langue' },
    ],
  },

  categories: {
    label: 'Catégories',
    apiEndpoint: 'categories',
    xmlTag: 'category',
    multilingualFields: ['name', 'description', 'meta_title', 'meta_keywords', 'meta_description', 'link_rewrite'],
    md5Fields: [],
    requiredFields: [
      { csv: 'Name *',        xml: 'name',   desc: 'Nom de la catégorie' },
      { csv: 'Active (0/1)',  xml: 'active', desc: 'Catégorie active' },
    ],
    optionalFields: [
      { csv: 'Description',      xml: 'description',      desc: 'Description' },
      { csv: 'Meta title',       xml: 'meta_title',       desc: 'Titre SEO' },
      { csv: 'Meta keywords',    xml: 'meta_keywords',    desc: 'Mots-clés SEO' },
      { csv: 'Meta description', xml: 'meta_description', desc: 'Description SEO' },
      { csv: 'URL rewritten',    xml: 'link_rewrite',     desc: 'URL simplifiée' },
    ],
  },

  combinations: {
    label: 'Déclinaisons',
    apiEndpoint: 'combinations',
    xmlTag: 'combination',
    multilingualFields: [],
    md5Fields: [],
    requiredFields: [
      { csv: 'Product ID *',                    xml: 'id_product', desc: 'ID du produit parent' },
      { csv: 'Attribute (Name:Type:Position)*', xml: 'reference',  desc: 'Attribut de déclinaison' },
    ],
    optionalFields: [
      { csv: 'Reference #',     xml: 'reference',       desc: 'Référence' },
      { csv: 'EAN13',           xml: 'ean13',           desc: 'Code EAN13' },
      { csv: 'Wholesale price', xml: 'wholesale_price', desc: 'Prix grossiste' },
      { csv: 'Impact on price', xml: 'price',           desc: 'Impact sur le prix' },
      { csv: 'Quantity',        xml: 'quantity',        desc: 'Quantité' },
    ],
  },

  stock: {
    label: 'Stock',
    apiEndpoint: 'stock_availables',
    xmlTag: 'stock_available',
    multilingualFields: [],
    md5Fields: [],
    requiredFields: [
      { csv: 'Product ID *', xml: 'id_product', desc: 'ID du produit' },
      { csv: 'Quantity *',   xml: 'quantity',   desc: 'Quantité disponible' },
    ],
    optionalFields: [
      { csv: 'Depends on stock', xml: 'depends_on_stock', desc: 'Dépend du stock avancé' },
      { csv: 'Out of stock',     xml: 'out_of_stock',     desc: 'Comportement rupture' },
    ],
  },
}

export const MODULE_KEYS = Object.keys(MODULES_CONFIG)
export const TYPE_COLUMN_NAMES = ['type', 'Type', 'module', 'Module', 'entity', 'Entity']