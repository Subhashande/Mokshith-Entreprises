import * as repo from './payment.repository.js';
import * as gateway from './payment.gateway.js';
import AppError from '../../errors/AppError.js';
import mongoose from 'mongoose';

import Order from '../order/order.model.js';
import * as creditRepo from '../credit/credit.repository.js';
import { generateInvoice } from '../invoice/invoice.service.js';

import { repayCredit } from '../credit/credit.service.js';
import { sendNotification } from '../notification/notification.service.js';
import { TEMPLATES } from '../notification/notification.templates.js';

export const createRazorpayOrder = async (amount) => {
  // Razorpay minimum amount is 100 paise (₹1)
  if (!amount || amount < 1) {
    throw new AppError('Minimum payment amount is ₹1', 400);
  }

  const options = {
    amount: amount,
    receipt: "order_rcptid_" + Date.now(),
  };

  const order = await gateway.createPaymentOrder(options);
  return order;
};

export const hybridPayment = async (orderId, userId, useCredit) => {
  console.log('Hybrid payment request:', { orderId, userId, useCredit });

  // 🔥 ADD: prevent "hybrid" string issue
  if (orderId === 'hybrid') {
    console.error('Route conflict: orderId received as "hybrid"');
    throw new AppError('Invalid orderId passed', 400);
  }

  // 🔥 ADD: ensure string
  orderId = String(orderId);

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    console.error('Invalid orderId format:', orderId);
    throw new AppError('Invalid order ID format', 400);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    console.error('Order not found:', orderId);
    throw new AppError('Order not found', 404);
  }

  console.log('Order status:', { 
    id: order._id, 
    totalAmount: order.totalAmount, 
    paymentStatus: order.paymentStatus,
    status: order.status 
  });

  if (typeof order.totalAmount !== 'number' || isNaN(order.totalAmount)) {
    console.error('Invalid totalAmount for order:', order._id);
    throw new AppError('Order has an invalid total amount', 400);
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError('Order is already paid', 400);
  }

  let remainingAmount = Math.round(order.totalAmount * 100) / 100;

  if (useCredit) {
    const credit = await creditRepo.findByUser(userId);
    console.log('Credit info:', credit ? { 
      available: credit.availableCredit, 
      status: credit.status 
    } : 'No credit account');

    if (credit && credit.availableCredit > 0 && credit.status !== 'BLOCKED') {
      const usedAmount = Math.round(Math.min(credit.availableCredit, remainingAmount) * 100) / 100;

      console.log('Deducting credit:', usedAmount);

      credit.availableCredit = Math.round((credit.availableCredit - usedAmount) * 100) / 100;
      credit.usedCredit = Math.round((credit.usedCredit + usedAmount) * 100) / 100;
      await credit.save();

      await creditRepo.addLedger({
        userId,
        amount: usedAmount,
        type: 'DEBIT',
        description: `Hybrid payment for Order #${orderId}`,
      });

      remainingAmount = Math.round((remainingAmount - usedAmount) * 100) / 100;
      console.log('Remaining after credit:', remainingAmount);
    }
  }

  if (remainingAmount <= 0) {
    order.paymentStatus = 'PAID';

    try {
      const { validateTransition } = await import('../order/order.workflow.js');
      validateTransition(order.status, 'CONFIRMED');
      order.status = 'CONFIRMED';
    } catch (err) {
      console.warn('Status transition skip:', err.message);
    }

    await order.save();

    try {
      await generateInvoice(order);
    } catch (err) {
      console.error('Invoice generation failed:', err.message);
    }

    return { paidFullyByCredit: true };
  }

  // 🔥 ADD: safety log before Razorpay
  console.log('Creating Razorpay order for amount:', remainingAmount);

  try {
    const rzpOrder = await createRazorpayOrder(remainingAmount);

    // 🔥 ADD: validate Razorpay response
    if (!rzpOrder || !rzpOrder.gatewayOrderId) {
      console.error('Invalid Razorpay response:', rzpOrder);
      throw new AppError('Failed to create payment order', 500);
    }

    await repo.createPayment({
      orderId,
      userId,
      amount: remainingAmount,
      transactionId: rzpOrder.gatewayOrderId,
      paymentMethod: 'ONLINE',
    });

    return { 
      paidFullyByCredit: false, 
      remainingAmount,
      gateway: rzpOrder 
    };
  } catch (error) {
    console.error('Razorpay creation failed in hybrid flow:', error.message);
    throw new AppError(error.message, 400);
  }
};

export const initiatePayment = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  if (order.paymentStatus === 'PAID') {
    throw new AppError('Order already paid', 400);
  }

  if (order.paymentMethod === 'CREDIT') {
    return {
      message: 'Payment handled via credit',
    };
  }

  const paymentOrder = await gateway.createPaymentOrder({
    amount: order.totalAmount,
  });

  const payment = await repo.createPayment({
    orderId,
    userId,
    amount: order.totalAmount,
    transactionId: paymentOrder.gatewayOrderId,
    paymentMethod: order.paymentMethod || 'ONLINE',
  });

  return {
    payment,
    gateway: paymentOrder,
  };
};

export const verifyPayment = async (payload) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

  const isValid = await gateway.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) throw new AppError('Payment verification failed', 400);

  const payment = await repo.findByOrderId(orderId);

  if (!payment) throw new AppError('Payment not found', 404);

  if (payment.status === 'SUCCESS') {
    return payment;
  }

  payment.status = 'SUCCESS';
  await payment.save();

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  order.paymentStatus = 'PAID';

  try {
    const { validateTransition } = await import('../order/order.workflow.js');
    validateTransition(order.status, 'CONFIRMED');
    order.status = 'CONFIRMED';
  } catch (err) {
    console.warn('Order status update skipped:', err.message);
  }

  await order.save();

  try {
    await generateInvoice(order);
  } catch (err) {
    console.error('Invoice generation failed:', err.message);
  }

  if (order.paymentMethod === 'CREDIT') {
    await repayCredit(order.userId, order.totalAmount);
  }

  await sendNotification({
    userId: order.userId,
    ...TEMPLATES.PAYMENT_SUCCESS(order.totalAmount),
  });

  return payment;
};