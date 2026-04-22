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

  const amount = order.totalAmount / 1.18; // Assuming finalTotal includes 18% GST
  const taxAmount = order.totalAmount - amount;

  return repo.createInvoice({
    orderId: order._id,
    userId: order.userId,
    amount: Math.round(amount * 100) / 100,
    gst: 18,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: order.totalAmount,
    invoiceNumber: generateInvoiceNumber(),
  });
};