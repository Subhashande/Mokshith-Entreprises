/**
 * @typedef {Object} Variant
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {number} stock
 */

/**
 * @typedef {Object} BulkPrice
 * @property {number} minQty
 * @property {number} price
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {Variant[]} variants
 * @property {BulkPrice[]} bulkPricing
 */