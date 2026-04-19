import * as repo from './payment.repository.js';
import * as gateway from './payment.gateway.js';
import AppError from '../../errors/AppError.js';

import Order from '../order/order.model.js';

import { repayCredit } from '../credit/credit.service.js';
import { sendNotification } from '../notification/notification.service.js';
import { TEMPLATES } from '../notification/notification.templates.js';

export const initiatePayment = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  // 🔥 Skip payment if already paid
  if (order.paymentStatus === 'PAID') {
    throw new AppError('Order already paid', 400);
  }

  // 🔥 Credit orders don't need gateway
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
  const isValid = await gateway.verifyPayment(payload);

  if (!isValid) throw new AppError('Payment verification failed', 400);

  const payment = await repo.findByOrderId(payload.orderId);

  if (!payment) throw new AppError('Payment not found', 404);

  // 🔥 Prevent duplicate success
  if (payment.status === 'SUCCESS') {
    return payment;
  }

  payment.status = 'SUCCESS';
  await payment.save();

  // 🔥 Update Order
  const order = await Order.findById(payload.orderId);

  order.paymentStatus = 'PAID';
  order.status = 'CONFIRMED';
  await order.save();

  // 🔥 Credit repayment (if needed)
  if (order.paymentMethod === 'CREDIT') {
    await repayCredit(order.userId, order.totalAmount);
  }

  // 🔥 Notification
  await sendNotification({
    userId: order.userId,
    ...TEMPLATES.PAYMENT_SUCCESS(order.totalAmount),
  });

  return payment;
};