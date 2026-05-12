// src/api/utils/modulesConfig.js

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

    // ==================== SECTION RESET ====================
    reset: {
      order: 5,
      mainEndpoint: 'products',
      label: 'Produits',
      countEndpoint: 'products',
      subEntities: [
        { key: 'images',                       label: 'Images',                        endpoint: 'images' },
        { key: 'combinations',                 label: 'Combinations',                 endpoint: 'combinations' },
        { key: 'product_customization_fields', label: 'Product Customization Fields', endpoint: 'product_customization_fields' },
        { key: 'product_option_values',        label: 'Product Option Values',        endpoint: 'product_option_values' },
        { key: 'product_options',              label: 'Product Options',              endpoint: 'product_options' },
        { key: 'product_feature_values',       label: 'Product Feature Values',       endpoint: 'product_feature_values' },
        { key: 'product_suppliers',            label: 'Product Suppliers',            endpoint: 'product_suppliers' },
        { key: 'products_features',            label: 'Products Features',            endpoint: 'products_features' },
      ]
    }
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

    reset: {
      order: 2,
      mainEndpoint: 'customers',
      label: 'Clients',
      countEndpoint: 'customers',
      subEntities: [
        { key: 'addresses',           label: 'Addresses',             endpoint: 'addresses' },
        { key: 'customer_threads',    label: 'Customer Threads',      endpoint: 'customer_threads' },
        { key: 'customers_messages',  label: 'Customer Messages',     endpoint: 'customer_messages' },
        { key: 'carts',               label: 'Carts',                 endpoint: 'carts' },
        { key: 'cart_rules',          label: 'Cart Rules',            endpoint: 'cart_rules' },
        { key: 'guests',              label: 'Guests',                endpoint: 'guests' },
      ]
    }
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

    reset: {
      order: 1,
      mainEndpoint: 'orders',
      label: 'Commandes',
      countEndpoint: 'orders',
      subEntities: [
        { key: 'order_carriers',      label: 'Order Carriers',        endpoint: 'order_carriers' },
        { key: 'order_cart_rules',    label: 'Order Cart Rules',      endpoint: 'order_cart_rules' },
        { key: 'order_details',       label: 'Order Details',         endpoint: 'order_details' },
        { key: 'order_histories',     label: 'Order Histories',       endpoint: 'order_histories' },
        { key: 'order_invoices',      label: 'Order Invoices',        endpoint: 'order_invoices' },
        { key: 'order_payments',      label: 'Order Payments',        endpoint: 'order_payments' },
        { key: 'order_slip',          label: 'Order Slip',            endpoint: 'order_slip' },
        { key: 'order_states',        label: 'Order States',          endpoint: 'order_states' },
      ]
    }
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

    reset: {
      order: 6,
      mainEndpoint: 'categories',
      label: 'Catégories',
      countEndpoint: 'categories',
      subEntities: [
        { key: 'tags',                        label: 'Tags',                        endpoint: 'tags' },
        { key: 'content_management_system',   label: 'Content Management System',   endpoint: 'content_management_system' },
      ],
      protectedIds: ['1', '2']
    }
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

    reset: {
      order: 3,
      mainEndpoint: 'combinations',
      label: 'Déclinaisons',
      countEndpoint: 'combinations',
      subEntities: [
        { key: 'stock_availables', label: 'Stock lié aux déclinaisons', endpoint: 'stock_availables' },
      ],
      protectedIds: []
    }
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

    reset: {
      order: 4,
      mainEndpoint: 'stock_availables',
      label: 'Stock',
      countEndpoint: 'stock_availables',
      subEntities: [
        { key: 'stock_movements',              label: 'Stock Movements',             endpoint: 'stock_movements' },
        { key: 'stock_movement_reasons',       label: 'Stock Movement Reasons',       endpoint: 'stock_movement_reasons' },
        { key: 'stocks',                       label: 'Stocks',                       endpoint: 'stocks' },
        { key: 'warehouse_product_locations',  label: 'Warehouse Product Locations',  endpoint: 'warehouse_product_locations' },
      ]
    }
  },

  suppliers: {
    label: 'Fournisseurs',
    apiEndpoint: 'suppliers',
    xmlTag: 'supplier',
    reset: {
      order: 7,
      mainEndpoint: 'suppliers',
      label: 'Fournisseurs',
      countEndpoint: 'suppliers',
      subEntities: [
        { key: 'product_suppliers', label: 'Product Suppliers', endpoint: 'product_suppliers' },
      ]
    }
  },

  manufacturers: {
    label: 'Marques / Fabricants',
    apiEndpoint: 'manufacturers',
    xmlTag: 'manufacturer',
    reset: {
      order: 8,
      mainEndpoint: 'manufacturers',
      label: 'Marques',
      countEndpoint: 'manufacturers',
      subEntities: []
    }
  },

  warehouses: {
    label: 'Entrepôts & Approvisionnement',
    apiEndpoint: 'warehouses',
    xmlTag: 'warehouse',
    reset: {
      order: 3,
      mainEndpoint: 'warehouses',
      label: 'Entrepôts',
      countEndpoint: 'warehouses',
      subEntities: [
        { key: 'deliveries',                    label: 'Deliveries',                   endpoint: 'deliveries' },
        { key: 'supply_orders',                 label: 'Supply Orders',                endpoint: 'supply_orders' },
        { key: 'supply_order_details',          label: 'Supply Order Details',         endpoint: 'supply_order_details' },
        { key: 'supply_order_histories',        label: 'Supply Order Histories',       endpoint: 'supply_order_histories' },
      ]
    }
  },

  taxes: {
    label: 'Prix & Taxes',
    apiEndpoint: 'taxes',
    xmlTag: 'tax',
    reset: {
      order: 9,
      mainEndpoint: 'taxes',
      label: 'Taxes',
      countEndpoint: 'taxes',
      subEntities: [
        { key: 'specific_prices',      label: 'Specific Prices',      endpoint: 'specific_prices' },
        { key: 'tax_rules',            label: 'Tax Rules',            endpoint: 'tax_rules' },
        { key: 'tax_rules_groups',     label: 'Tax Rules Groups',     endpoint: 'tax_rules_groups' },
      ]
    }
  }
}

// Utilitaires exportés
export const MODULE_KEYS = Object.keys(MODULES_CONFIG)

// Retourne les modules triés par ordre de suppression (très important)
export const getResetOrder = () => {
  return MODULE_KEYS
    .map(key => ({
      key,
      ...MODULES_CONFIG[key].reset
    }))
    .sort((a, b) => a.order - b.order)
}

export const TYPE_COLUMN_NAMES = ['type', 'Type', 'module', 'Module', 'entity', 'Entity']