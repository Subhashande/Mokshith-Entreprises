import * as repo from './payment.repository.js';
import * as gateway from './payment.gateway.js';
import AppError from '../../errors/AppError.js';
import Order from '../order/order.model.js';

export const initiatePayment = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) throw new AppError('Order not found', 404);

  const paymentOrder = await gateway.createPaymentOrder({
    amount: order.totalAmount,
  });

  const payment = await repo.createPayment({
    orderId,
    userId,
    amount: order.totalAmount,
    transactionId: paymentOrder.gatewayOrderId,
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

  payment.status = 'SUCCESS';
  await payment.save();

  // update order
  const order = await Order.findById(payload.orderId);
  order.status = 'CONFIRMED';
  await order.save();

  return payment;
};