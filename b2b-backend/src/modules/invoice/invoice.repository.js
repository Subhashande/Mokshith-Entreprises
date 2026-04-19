import Invoice from './invoice.model.js';

export const createInvoice = (data) => Invoice.create(data);

export const findByOrderId = (orderId) =>
  Invoice.findOne({ orderId });

export const findById = (id) =>
  Invoice.findById(id);