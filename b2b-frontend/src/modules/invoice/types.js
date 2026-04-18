/**
 * @typedef {Object} InvoiceItem
 * @property {string} name
 * @property {number} quantity
 * @property {number} price
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id
 * @property {string} orderId
 * @property {string} customerName
 * @property {InvoiceItem[]} items
 * @property {number} totalAmount
 * @property {string} createdAt
 */