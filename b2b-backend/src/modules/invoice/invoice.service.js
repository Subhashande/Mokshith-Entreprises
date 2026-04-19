import * as repo from './invoice.repository.js';
import { generateInvoiceNumber } from './invoice.generator.js';
import AppError from '../../errors/AppError.js';

export const generateInvoice = async (order) => {
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // 🔥 Prevent duplicate invoice
  const existing = await repo.findByOrderId(order._id);

  if (existing) {
    return existing; // return existing instead of error
  }

  return repo.createInvoice({
    orderId: order._id,
    userId: order.userId,
    amount: order.totalAmount,
    invoiceNumber: generateInvoiceNumber(),
  });
};