import * as repo from './invoice.repository.js';
import { generateInvoiceNumber, createInvoicePDF } from './invoice.generator.js';
import AppError from '../../errors/AppError.js';
import Order from '../order/order.model.js';
import User from '../user/user.model.js';
import Product from '../product/product.model.js';

export const generateInvoice = async (orderId) => {
  const order = await Order.findById(orderId).populate('userId');
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  //  Prevent duplicate invoice
  const existing = await repo.findByOrderId(order._id);
  if (existing) {
    return existing;
  }

  // Calculate GST per item
  let totalBaseAmount = 0;
  let totalTaxAmount = 0;

  const itemDetails = await Promise.all(order.items.map(async (item) => {
    const product = await Product.findById(item.productId);
    const gstRate = product?.gst || 18;
    const basePrice = item.price / (1 + gstRate / 100);
    const taxPerUnit = item.price - basePrice;
    
    totalBaseAmount += basePrice * item.quantity;
    totalTaxAmount += taxPerUnit * item.quantity;

    return {
      ...item,
      basePrice,
      gstRate,
      taxPerUnit
    };
  }));

  const invoiceNumber = generateInvoiceNumber();

  const invoiceData = {
    orderId: order._id,
    userId: order.userId._id,
    amount: Math.round(totalBaseAmount * 100) / 100,
    gst: 18, // fallback/average
    taxAmount: Math.round(totalTaxAmount * 100) / 100,
    totalAmount: order.totalAmount,
    invoiceNumber,
  };

  const invoice = await repo.createInvoice(invoiceData);

  // Generate PDF asynchronously
  try {
    const pdfPath = await createInvoicePDF(invoice, { ...order.toObject(), itemDetails }, order.userId);
    invoice.fileUrl = `/uploads/invoices/invoice-${invoiceNumber}.pdf`;
    await invoice.save();
  } catch (err) {
    console.error('PDF Generation failed:', err);
  }

  return invoice;
};

export const getInvoiceByOrderId = async (orderId) => {
  return repo.findByOrderId(orderId);
};