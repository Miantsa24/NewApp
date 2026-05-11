export const RESET_CONFIG = {
  products: {
    label: 'Produits',

    mainResource: 'products',

    relatedResources: [
      'product_lang',
      'category_product',
      'image',
      'stock_available',
      'product_attribute',
    ],

    protectedIds: [],

    deleteOrder: [
      'combinations',
      'stock',
      'images',
      'category_links',
      'product',
    ],

    description:
      'Supprime les produits ainsi que leurs relations catégories, stock, images et déclinaisons.',
  },

  categories: {
    label: 'Catégories',

    mainResource: 'categories',

    relatedResources: [
      'category_lang',
      'category_product',
    ],

    protectedIds: [1, 2],

    deleteOrder: [
      'category_links',
      'category',
    ],

    description:
      'Supprime les catégories sauf les catégories système.',
  },
}