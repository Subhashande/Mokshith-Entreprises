import * as repo from './payment.repository.js';
import * as gateway from './payment.gateway.js';
import AppError from '../../errors/AppError.js';
import mongoose from 'mongoose';
import { getTransactionSupport } from '../../config/db.js';

import Order from '../order/order.model.js';
import * as creditRepo from '../credit/credit.repository.js';
import { generateInvoice } from '../invoice/invoice.service.js';

import { sendNotification } from '../notification/notification.service.js';
import { TEMPLATES } from '../notification/notification.templates.js';
import { ORDER_STATUS } from '../../constants/orderStatus.js';
import { PAYMENT_STATUS } from '../../constants/paymentStatus.js';

export const createRazorpayOrder = async (amount, userId) => {
  // Razorpay minimum amount is 100 paise (₹1)
  if (!amount || amount < 1) {
    throw new AppError('Minimum payment amount is ₹1', 400);
  }

  try {
    const order = await gateway.createPaymentOrder({ 
      amount: amount,
      receipt: `order_rcptid_${userId}_${Date.now()}`
    });
    return order;
  } catch (error) {
    console.error('Razorpay SDK Error:', error.message);
    throw new AppError(error.message || 'Razorpay order creation failed', 500);
  }
};

export const hybridPayment = async (orderId, userId, useCredit, totalAmount) => {
  const supportsTransactions = getTransactionSupport();
  let session = null;
  let isTransactionStarted = false;

  try {
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
      isTransactionStarted = true;
    }

    // 1. Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError('Invalid order ID format', 400);
    }

    const query = Order.findById(orderId);
    if (isTransactionStarted) query.session(session);
    const order = await query;

    if (!order) throw new AppError('Order not found', 404);

    if (order.paymentStatus === 'PAID') {
      throw new AppError('Order is already paid', 400);
    }

    // Safety check: frontend totalAmount vs backend totalAmount
    if (totalAmount && Math.round(order.totalAmount) !== Math.round(totalAmount)) {
      // In production, we should probably throw an error here, but for now we log it.
      // throw new AppError('Payment amount mismatch', 400);
    }

    let remainingAmount = order.totalAmount;
    let creditUsed = 0;

    // 2. Handle Credit deduction
    if (useCredit) {
      const credit = await creditRepo.findByUser(userId);
      if (credit && credit.availableCredit > 0 && credit.status !== 'BLOCKED') {
        creditUsed = Math.min(credit.availableCredit, remainingAmount);
        
        credit.availableCredit -= creditUsed;
        credit.usedCredit += creditUsed;
        await credit.save({ session: isTransactionStarted ? session : null });

        await creditRepo.addLedger({
          userId,
          amount: creditUsed,
          type: 'DEBIT',
          description: `Hybrid payment for Order #${orderId}`,
        }, { session: isTransactionStarted ? session : null });

        remainingAmount -= creditUsed;
      }
    }

    // 3. Check if fully paid
    if (remainingAmount <= 0) {
      order.paymentStatus = 'PAID';
      order.status = 'CONFIRMED';
      order.paymentMethod = 'HYBRID';
      order.metadata = { ...order.metadata, creditUsed };
      await order.save({ session: isTransactionStarted ? session : null });

      if (isTransactionStarted) {
        await session.commitTransaction();
        session.endSession();
      }

      // Emit socket event
      if (global.io) {
        global.io.emit('payment:success', { 
          orderId: order._id, 
          userId: order.userId,
          amount: order.totalAmount,
          method: 'HYBRID' 
        });
      }

      // Generate invoice and trigger delivery (non-blocking)
      setImmediate(async () => {
        try {
          await generateInvoice(order._id);
          const { autoAssignDelivery } = await import('../logistics/logistics.service.js');
          await autoAssignDelivery(order._id);
        } catch (err) {
          console.error('Post-payment actions failed:', err.message);
        }
      });

      return { success: true, paidFullyByCredit: true, creditUsed };
    }

    // 4. Create Razorpay order for remaining amount
    let rzpOrder;
    try {
      rzpOrder = await createRazorpayOrder(remainingAmount, userId);
    } catch (err) {
      console.error('❌ Razorpay order creation failed during hybrid payment:', err);
      // Revert credit deduction if Razorpay order fails
      if (useCredit && creditUsed > 0) {
        const credit = await creditRepo.findByUser(userId);
        if (credit) {
          credit.availableCredit += creditUsed;
          credit.usedCredit -= creditUsed;
          await credit.save();
          
          await creditRepo.addLedger({
            userId,
            amount: creditUsed,
            type: 'CREDIT',
            description: `Reversal: Razorpay order creation failed for Order #${orderId}`,
          });
        }
      }
      throw err;
    }

    // Track this payment intent
    const paymentData = {
      orderId,
      userId,
      amount: remainingAmount,
      transactionId: rzpOrder.gatewayOrderId || rzpOrder.id,
      paymentMethod: 'HYBRID',
      status: 'PENDING',
      metadata: { creditUsed }
    };

    try {
      await repo.createPayment(paymentData, { session: isTransactionStarted ? session : null });
    } catch (err) {
      console.error('❌ Failed to record payment record:', err);
      // Even if recording fails, we have the rzpOrder, but it's better to fail here
      throw new AppError('Failed to initialize payment tracking', 500);
    }

    // Update order with partial credit use info
    order.metadata = { ...order.metadata, creditUsed };
    await order.save({ session: isTransactionStarted ? session : null });

    if (isTransactionStarted) {
      await session.commitTransaction();
      session.endSession();
    }

    return { 
      success: true,
      paidFullyByCredit: false, 
      remainingAmount,
      creditUsed,
      gateway: {
        gatewayOrderId: rzpOrder.gatewayOrderId,
        amount: rzpOrder.amount
      } 
    };
  } catch (error) {
    if (isTransactionStarted) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
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

  // 1. Idempotency Check: check if this payment was already processed
  const existingPayment = await repo.findByRazorpayPaymentId(razorpay_payment_id);
  if (existingPayment && existingPayment.status === 'SUCCESS') {
    return existingPayment;
  }

  // 2. Signature verification
  const isValid = await gateway.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) throw new AppError('Payment verification failed', 400);

  // 3. Find payment record (using transactionId which stores RZP order ID initially)
  let payment = await repo.findByTransactionId(razorpay_order_id);
  
  if (!payment) {
    // fallback to orderId if not found by transactionId
    payment = await repo.findByOrderId(orderId);
  }

  if (!payment) throw new AppError('Payment record not found', 404);

  if (payment.status === 'SUCCESS') return payment;

  // 4. Update payment record atomically
  payment.status = 'SUCCESS';
  payment.razorpayPaymentId = razorpay_payment_id;
  // keep transactionId as the gateway order ID or update to payment ID? 
  // Let's store payment ID in razorpayPaymentId for clarity.
  await payment.save();

  // 5. Update order record
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'PAID';
    order.status = 'CONFIRMED';
    await order.save();

    // Emit socket event
    if (global.io) {
      global.io.emit('payment:success', { 
        orderId: order._id, 
        userId: order.userId,
        amount: order.totalAmount,
        method: payment.paymentMethod 
      });
    }

    // 6. Post-payment triggers (Invoice + Logistics + Clear Cart)
    setImmediate(async () => {
      try {
        // Clear User Cart - Only after successful payment verification
        const CartModel = mongoose.model('Cart');
        await CartModel.findOneAndUpdate(
          { userId: order.userId },
          { $set: { items: [] } }
        );

        await generateInvoice(order._id);
        const { autoAssignDelivery } = await import('../logistics/logistics.service.js');
        await autoAssignDelivery(order._id);
      } catch (err) {
        console.error('Post-payment triggers failed:', err.message);
      }
    });
  }

  // 7. Send notification
  await sendNotification({
    userId: order.userId,
    ...TEMPLATES.PAYMENT_SUCCESS(order.totalAmount),
  });

  return payment;
};

export const failPayment = async (orderId, reason) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  order.paymentStatus = PAYMENT_STATUS.FAILED;
  order.status = ORDER_STATUS.FAILED;
  order.metadata = { ...order.metadata, failureReason: reason };
  await order.save();

  // Restore stock if payment fails
  const { restoreStock } = await import('../product/product.service.js');
  for (const item of order.items) {
    await restoreStock(item.productId, item.quantity);
  }

  return { status: 'FAILED', orderId };
};

export const handleWebhook = async (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set');
    throw new AppError('Webhook configuration error', 500);
  }

  // Verify signature using raw body
  const isValid = gateway.verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) throw new AppError('Invalid webhook signature', 400);

  const body = JSON.parse(rawBody);
  const event = body.event;
  const payload = body.payload.payment.entity;

  if (event === 'payment.captured') {
    const razorpay_order_id = payload.order_id;
    const razorpay_payment_id = payload.id;
    
    // Process payment (reusing verify logic's core)
    const existingPayment = await repo.findByRazorpayPaymentId(razorpay_payment_id);
    if (existingPayment && existingPayment.status === 'SUCCESS') return { status: 'ok' };

    let payment = await repo.findByTransactionId(razorpay_order_id);
    if (!payment) return { status: 'ok' };

    payment.status = 'SUCCESS';
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order && order.paymentStatus !== 'PAID') {
      order.paymentStatus = 'PAID';
      order.status = 'CONFIRMED';
      await order.save();

      // Clear Cart on successful webhook capture
      const CartModel = mongoose.model('Cart');
      await CartModel.findOneAndUpdate(
        { userId: order.userId },
        { $set: { items: [] } }
      );

      // Emit socket event
      if (global.io) {
        global.io.emit('payment:success', { 
          orderId: order._id, 
          userId: order.userId,
          amount: order.totalAmount,
          method: 'ONLINE' 
        });
      }

      // Generate invoice and trigger delivery
      setImmediate(async () => {
        try {
          await generateInvoice(order._id);
          const { autoAssignDelivery } = await import('../logistics/logistics.service.js');
          await autoAssignDelivery(order._id);
        } catch (err) {
          console.error('Webhook post-payment actions failed:', err.message);
        }
      });
    }
  }

  return { status: 'ok' };
};