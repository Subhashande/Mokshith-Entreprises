import Payment from './payment.model.js';

export const createPayment = (data) => Payment.create(data);

export const updatePayment = (id, data) =>
  Payment.findByIdAndUpdate(id, data, { new: true });

export const findByOrderId = (orderId) =>
  Payment.findOne({ orderId }).sort({ createdAt: -1 });

export const findByTransactionId = (transactionId) =>
  Payment.findOne({ transactionId });

export const findByRazorpayPaymentId = (razorpayPaymentId) =>
  Payment.findOne({ razorpayPaymentId });