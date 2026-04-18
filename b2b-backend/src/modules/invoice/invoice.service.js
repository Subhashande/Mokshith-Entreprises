import * as repo from './invoice.repository.js';
import { generateInvoiceNumber } from './invoice.generator.js';

export const generateInvoice = async (order) => {
  return repo.createInvoice({
    orderId: order._id,
    userId: order.userId,
    amount: order.totalAmount,
    invoiceNumber: generateInvoiceNumber(),
  });
};