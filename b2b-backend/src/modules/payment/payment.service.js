import * as repo from './payment.repository.js';
import * as gateway from './payment.gateway.js';
import AppError from '../../errors/AppError.js';
import mongoose from 'mongoose';
import { getTransactionSupport } from '../../config/db.js';
import { logger } from '../../config/logger.js';

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
      receipt: `rcpt_${userId.toString().slice(-6)}_${Date.now()}` // Shortened to fit Razorpay's 40-char limit
    });
    return order;
  } catch (error) {
    logger.error('Razorpay order creation failed', {
      error: error.message,
      userId,
      amount,
      stack: error.stack
    });
    throw new AppError(error.message || 'Razorpay order creation failed', 500);
  }
};

export const hybridPayment = async (orderId, userId, useCredit, totalAmount, paymentMethod = 'HYBRID') => {
  const supportsTransactions = getTransactionSupport();
  let session = null;
  let isTransactionStarted = false;

  // 🔒 Distributed lock to prevent race conditions
  const { redisClient } = await import('../../config/redis.js');
  const { logger } = await import('../../config/logger.js');
  const lockKey = `payment:lock:${orderId}`;
  const lockValue = `${userId}-${Date.now()}`;
  
  // 🔒 PHASE 2 FIX: Detect and clean stale locks before acquisition
  const staleDetected = await redisClient.detectStaleLock(lockKey);
  if (staleDetected) {
    logger.warn('Removed stale payment lock before acquisition', { orderId, userId });
  }
  
  // 🔒 CRITICAL FIX: Retry lock acquisition with exponential backoff
  let lockAcquired = false;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (!lockAcquired && attempts < maxAttempts) {
    lockAcquired = await redisClient.acquireLock(lockKey, lockValue, 60);
    
    if (!lockAcquired) {
      attempts++;
      if (attempts < maxAttempts) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.pow(2, attempts - 1) * 100;
        logger.warn('Payment lock busy, retrying', { orderId, userId, attempt: attempts, delayMs: delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  if (!lockAcquired) {
    logger.error('Payment lock acquisition failed after retries', { orderId, userId, attempts });
    throw new AppError('Payment already in progress for this order. Please wait.', 409);
  }

  // 🔒 PHASE 2 FIX: Ensure lock is ALWAYS released using finally block
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

    // 🔥 HANDLE COD
    if (paymentMethod === 'COD') {
      order.paymentMethod = 'COD';
      order.status = 'CONFIRMED';
      order.paymentStatus = 'PENDING';
      await order.save({ session: isTransactionStarted ? session : null });
      
      if (isTransactionStarted) {
        await session.commitTransaction();
        session.endSession();
      }
      
      // Lock will be released in finally block
      return { success: true, paymentMethod: 'COD' };
    }

    // 🔒 CRITICAL: Enforce amount validation to prevent payment fraud
    if (totalAmount && Math.round(order.totalAmount) !== Math.round(totalAmount)) {
      logger.error('Payment amount mismatch detected - potential fraud', {
        orderId,
        expectedAmount: order.totalAmount,
        receivedAmount: totalAmount,
        userId
      });
      throw new AppError('Payment amount mismatch. Please refresh and try again.', 400);
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

      // 🔒 PHASE 4: Queue-based post-payment processing (replaces setImmediate)
      const { queuePostPaymentJobs } = await import('../../services/queueManager.service.js');
      await queuePostPaymentJobs({
        orderId: order._id.toString(),
        userId: order.userId.toString(),
        amount: order.totalAmount,
        paymentMethod: 'HYBRID',
      });

      // Lock will be released in finally block
      return { success: true, paidFullyByCredit: true, creditUsed };
    }

    // 4. Create Razorpay order for remaining amount
    let rzpOrder;
    try {
      rzpOrder = await createRazorpayOrder(remainingAmount, userId);
    } catch (err) {
      logger.error('Razorpay order creation failed during hybrid payment', { 
        orderId, 
        userId, 
        remainingAmount, 
        error: err.message,
        stack: err.stack 
      });
      
      // 🔒 Protected credit reversal - revert credit deduction if Razorpay order fails
      if (useCredit && creditUsed > 0) {
        try {
          // 🔒 PHASE 3 FIX: Credit reversal idempotency protection
          const reversalKey = `credit:reversal:${orderId}:${userId}`;
          const alreadyReversed = await redisClient.get(reversalKey);
          
          if (alreadyReversed) {
            logger.warn('Credit reversal already processed, skipping duplicate', { 
              orderId, 
              userId, 
              creditUsed 
            });
          } else {
            // Mark reversal as in-progress to prevent concurrent attempts
            await redisClient.setex(reversalKey, 3600, Date.now().toString()); // 1 hour TTL
            
            const credit = await creditRepo.findByUser(userId);
            if (credit) {
              credit.availableCredit += creditUsed;
              credit.usedCredit -= creditUsed;
              await credit.save({ session: isTransactionStarted ? session : null });
              
              await creditRepo.addLedger({
                userId,
                amount: creditUsed,
                type: 'CREDIT',
                description: `Reversal: Razorpay order creation failed for Order #${orderId}`,
              }, { session: isTransactionStarted ? session : null });
              
              logger.info('Credit reversal completed with idempotency', { 
                orderId, 
                creditUsed, 
                reversalKey 
              });
            }
          }
        } catch (reversalErr) {
          logger.error('Credit reversal failed', { 
            orderId, 
            userId, 
            creditUsed, 
            error: reversalErr.message,
            stack: reversalErr.stack 
          });
          // Don't throw - main error is more important
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
      logger.error('Failed to record payment record', { orderId, userId, error: err.message, stack: err.stack });
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

    // Lock will be released in finally block
    
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
    if (isTransactionStarted && session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (txErr) {
        logger.error('Transaction abort failed', { error: txErr.message });
      }
    }
    throw error;
  } finally {
    // 🔓 Always release lock in finally block
    try {
      const released = await redisClient.releaseLock(lockKey, lockValue);
      if (!released) {
        logger.warn('Lock release returned false', { orderId });
      }
    } catch (unlockError) {
      logger.error('Failed to release lock', { orderId, error: unlockError.message });
    }
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
  const { redisClient } = await import('../../config/redis.js');
  const { logger } = await import('../../config/logger.js');

  // 🔒 1. Replay Protection: Check if this payment_id was already processed
  const replayKey = `payment:processed:${razorpay_payment_id}`;
  const alreadyProcessed = await redisClient.get(replayKey);
  if (alreadyProcessed) {
    logger.warn('Payment replay attempt detected', { razorpay_payment_id, orderId });
    const existingPayment = await repo.findByRazorpayPaymentId(razorpay_payment_id);
    if (existingPayment) return existingPayment;
  }

  // 2. Database Idempotency Check
  const existingPayment = await repo.findByRazorpayPaymentId(razorpay_payment_id);
  if (existingPayment && existingPayment.status === 'SUCCESS') {
    logger.info('Payment already verified', { razorpay_payment_id });
    return existingPayment;
  }

  // 3. Check if order is already paid
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.paymentStatus === 'PAID') {
    logger.warn('Order already marked as paid', { orderId, razorpay_payment_id });
    return existingPayment || { status: 'SUCCESS', orderId, message: 'Order already paid' };
  }

  // 4. Signature verification
  const isValid = await gateway.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) {
    logger.error('Payment signature verification failed', { razorpay_payment_id, orderId });
    throw new AppError('Payment verification failed', 400);
  }

  // 5. Mark as processed in Redis (24h TTL)
  await redisClient.setex(replayKey, 86400, Date.now().toString());

  // 6. Find payment record (using transactionId which stores RZP order ID initially)
  let payment = await repo.findByTransactionId(razorpay_order_id);
  
  if (!payment) {
    // fallback to orderId if not found by transactionId
    payment = await repo.findByOrderId(orderId);
  }

  if (!payment) throw new AppError('Payment record not found', 404);

  if (payment.status === 'SUCCESS') {
    logger.info('Payment already marked as success', { razorpay_payment_id });
    return payment;
  }

  // 7. Update payment record atomically
  payment.status = 'SUCCESS';
  payment.razorpayPaymentId = razorpay_payment_id;
  await payment.save();

  logger.info('Payment verified successfully', { orderId, razorpay_payment_id });
  
  // 🔒 PHASE 2 FIX: Additional amount validation if available in payload
  if (payload.amount !== undefined) {
    const receivedAmount = typeof payload.amount === 'number' ? payload.amount / 100 : payload.amount;
    const amountDifference = Math.abs(order.totalAmount - receivedAmount);
    
    if (amountDifference > 1) {
      logger.error('🚨 SECURITY ALERT: Payment verification amount mismatch', {
        orderId: order._id,
        userId: order.userId,
        expectedAmount: order.totalAmount,
        receivedAmount,
        difference: amountDifference,
        razorpay_payment_id,
        severity: 'CRITICAL'
      });
      
      // Rollback payment status
      payment.status = 'FAILED';
      payment.metadata = {
        ...payment.metadata,
        failureReason: 'Amount mismatch in verification',
        expectedAmount: order.totalAmount,
        receivedAmount
      };
      await payment.save();
      
      throw new AppError('Payment amount mismatch detected - transaction rejected', 400);
    }
  }

  // 8. Update order record

  if (order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'PAID';
    order.status = 'CONFIRMED';
    await order.save();
    
    // 🔒 CRITICAL FIX: Finalize inventory reservation after successful payment
    // This actually deducts the stock that was previously only reserved
    try {
      const { finalizeReservation } = await import('../inventory/inventory.service.js');
      await finalizeReservation(order._id.toString());
      logger.info('Inventory reservation finalized', { orderId: order._id });
    } catch (err) {
      logger.error('CRITICAL: Failed to finalize inventory reservation', {
        orderId: order._id,
        error: err.message,
        stack: err.stack
      });
      // This is critical - payment succeeded but inventory not deducted
      // Manual intervention may be required
    }

    // Emit socket event
    if (global.io) {
      global.io.emit('payment:success', { 
        orderId: order._id, 
        userId: order.userId,
        amount: order.totalAmount,
        method: payment.paymentMethod 
      });
    }

    // 6. 🔒 PHASE 4: Queue-based post-payment triggers (replaces setImmediate)
    // Ensures invoice generation and delivery assignment survive crashes
    const { queuePostPaymentJobs } = await import('../../services/queueManager.service.js');
    await queuePostPaymentJobs({
      orderId: order._id.toString(),
      userId: order.userId.toString(),
      amount: order.totalAmount,
      paymentMethod: payment.paymentMethod,
    });
    
    // Clear User Cart immediately (critical for UX)
    try {
      const CartModel = mongoose.model('Cart');
      await CartModel.findOneAndUpdate(
        { userId: order.userId },
        { $set: { items: [] } }
      );
    } catch (cartErr) {
      logger.error('Failed to clear cart after payment', { orderId: order._id, error: cartErr.message });
      // Don't fail payment verification if cart clear fails
    }
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

  // 🔒 CRITICAL FIX: Release inventory reservation on payment failure
  try {
    const { releaseReservation } = await import('../inventory/inventory.service.js');
    await releaseReservation(orderId);
    logger.info('Inventory reservation released on payment failure', { orderId });
  } catch (err) {
    logger.error('Failed to release inventory reservation', { orderId, error: err.message });
    // Non-blocking - reservation will auto-expire via TTL
  }

  // Note: For COD orders, stock was already deducted, so we need to restore it
  // For non-COD orders that failed before payment, stock was only reserved, now released
  if (order.paymentMethod === 'COD') {
    const { restoreStock } = await import('../product/product.service.js');
    for (const item of order.items) {
      await restoreStock(item.productId, item.quantity);
    }
  }

  return { status: 'FAILED', orderId };
};

export const handleWebhook = async (rawBody, signature) => {
  const { redisClient } = await import('../../config/redis.js');
  const { logger } = await import('../../config/logger.js');
  
  // 1. Validate webhook secret configuration
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
    throw new AppError('Webhook configuration error', 500);
  }

  // 2. Verify signature using raw body
  const isValid = gateway.verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    logger.error('Webhook signature verification failed');
    throw new AppError('Invalid webhook signature', 400);
  }

  const body = JSON.parse(rawBody);
  const event = body.event;
  const webhookId = body.id || `${event}_${Date.now()}`; // Razorpay webhook ID
  const payload = body.payload.payment.entity;

  // 3. Webhook Idempotency Check - prevent duplicate processing
  const webhookKey = `webhook:processed:${webhookId}`;
  const alreadyProcessed = await redisClient.get(webhookKey);
  if (alreadyProcessed) {
    logger.info('Webhook already processed, ignoring duplicate', { webhookId, event });
    return { status: 'ok', message: 'Already processed' };
  }

  // 4. Mark webhook as processed (24h TTL)
  await redisClient.setex(webhookKey, 86400, Date.now().toString());
  logger.info('Processing webhook', { webhookId, event });

  if (event === 'payment.captured') {
    const razorpay_order_id = payload.order_id;
    const razorpay_payment_id = payload.id;
    const amount = payload.amount / 100; // Convert paise to rupees
    
    logger.info('Processing payment.captured webhook', { razorpay_payment_id, razorpay_order_id });
    
    // 5. Check for duplicate payment processing
    const existingPayment = await repo.findByRazorpayPaymentId(razorpay_payment_id);
    if (existingPayment && existingPayment.status === 'SUCCESS') {
      logger.info('Payment already captured', { razorpay_payment_id });
      return { status: 'ok', message: 'Already captured' };
    }

    let payment = await repo.findByTransactionId(razorpay_order_id);
    if (!payment) return { status: 'ok' };

    payment.status = 'SUCCESS';
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order && order.paymentStatus !== 'PAID') {
      // 🔒 PHASE 2 FIX: STRICT webhook amount validation - immediately reject on mismatch
      const amountDifference = Math.abs(order.totalAmount - amount);
      if (amountDifference > 1) {
        logger.error('🚨 SECURITY ALERT: Webhook amount mismatch - REJECTING payment processing', {
          orderId: order._id,
          userId: order.userId,
          expectedAmount: order.totalAmount,
          receivedAmount: amount,
          difference: amountDifference,
          razorpay_payment_id,
          razorpay_order_id,
          severity: 'CRITICAL'
        });
        
        // 🔒 Mark payment as FAILED to prevent partial updates
        payment.status = 'FAILED';
        payment.metadata = {
          ...payment.metadata,
          failureReason: 'Amount mismatch detected',
          expectedAmount: order.totalAmount,
          receivedAmount: amount
        };
        await payment.save();
        
        // 🔒 Mark order as FAILED to prevent fulfillment
        order.status = 'FAILED';
        order.metadata = {
          ...order.metadata,
          securityAlert: 'Amount mismatch in webhook',
          expectedAmount: order.totalAmount,
          receivedAmount: amount
        };
        await order.save();
        
        // 🔒 STOP entire payment processing immediately
        throw new AppError('Payment amount mismatch detected - transaction rejected for security', 400);
      }
      
      order.paymentStatus = 'PAID';
      order.status = 'CONFIRMED';
      await order.save();
      
      logger.info('Order marked as paid via webhook', { orderId: order._id });
      
      // 🔒 CRITICAL FIX: Finalize inventory reservation after webhook payment
      try {
        const { finalizeReservation } = await import('../inventory/inventory.service.js');
        await finalizeReservation(order._id.toString());
        logger.info('Inventory reservation finalized via webhook', { orderId: order._id });
      } catch (err) {
        logger.error('CRITICAL: Failed to finalize inventory reservation via webhook', {
          orderId: order._id,
          error: err.message,
          stack: err.stack
        });
      }

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

      // 🔒 PHASE 4: Queue-based post-payment processing (replaces setImmediate)
      const { queuePostPaymentJobs } = await import('../../services/queueManager.service.js');
      await queuePostPaymentJobs({
        orderId: order._id.toString(),
        userId: order.userId.toString(),
        amount: order.totalAmount,
        paymentMethod: 'ONLINE',
      });

      // Clear cart immediately
      try {
        const CartModel = mongoose.model('Cart');
        await CartModel.findOneAndUpdate(
          { userId: order.userId },
          { $set: { items: [] } }
        );
      } catch (cartErr) {
        logger.error('Failed to clear cart via webhook', { orderId: order._id, error: cartErr.message });
      }
    }
  }

  return { status: 'ok' };
};

/**
 * 🔒 PHASE 4: Secure refund system with idempotency and inventory restoration
 * Creates a refund for an order with comprehensive validation and tracking
 */
export const createRefund = async (orderId, userId, refundAmount, reason, initiatedBy) => {
  const { redisClient } = await import('../../config/redis.js');
  const { logger } = await import('../../config/logger.js');
  const Refund = (await import('./refund.model.js')).default;
  const { restoreStock } = await import('../inventory/inventory.service.js');
  const { createRefund: gatewayCreateRefund } = await import('./payment.gateway.js');

  // 1. Validate order exists
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // 2. Verify user authorization (admin or order owner)
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(initiatedBy.role);
  if (!isAdmin && order.userId.toString() !== userId.toString()) {
    throw new AppError('Unauthorized to refund this order', 403);
  }

  // 3. Validate order is paid
  if (order.paymentStatus !== 'PAID') {
    throw new AppError('Cannot refund unpaid order', 400);
  }

  // 4. 🔒 Idempotency check - prevent duplicate refunds
  const refundKey = `refund:${orderId}:${userId}`;
  const existingRefundCheck = await redisClient.get(refundKey);
  if (existingRefundCheck) {
    logger.warn('Duplicate refund attempt detected', { orderId, userId });
    const existingRefund = await Refund.findById(existingRefundCheck);
    if (existingRefund) {
      return existingRefund;
    }
  }

  // 5. Find payment record
  const payment = await repo.findByOrderId(orderId);
  if (!payment || !payment.razorpayPaymentId) {
    throw new AppError('Payment record not found or incomplete', 404);
  }

  // 6. Check for existing refunds
  const existingRefunds = await Refund.find({ orderId, status: { $in: ['SUCCESS', 'PROCESSING'] } });
  const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

  // 7. Validate refund amount
  const maxRefundable = order.totalAmount - totalRefunded;
  const finalRefundAmount = refundAmount || maxRefundable;

  if (finalRefundAmount > maxRefundable) {
    throw new AppError(`Cannot refund ${finalRefundAmount}. Maximum refundable: ${maxRefundable}`, 400);
  }

  if (finalRefundAmount <= 0) {
    throw new AppError('Refund amount must be greater than 0', 400);
  }

  // 8. Determine refund type
  const refundType = finalRefundAmount === order.totalAmount ? 'FULL' : 'PARTIAL';

  // 9. Create refund record
  const refund = await Refund.create({
    orderId,
    paymentId: payment._id,
    userId: order.userId,
    amount: finalRefundAmount,
    refundType,
    status: 'INITIATED',
    razorpayPaymentId: payment.razorpayPaymentId,
    reason: reason || 'Customer request',
    initiatedBy: initiatedBy._id,
  });

  // 10. 🔒 Mark refund as in-progress for idempotency (24h TTL)
  await redisClient.setex(refundKey, 86400, refund._id.toString());

  try {
    // 11. Update refund status to processing
    refund.status = 'PROCESSING';
    await refund.save();

    // 12. Create Razorpay refund
    const gatewayRefund = await gatewayCreateRefund({
      paymentId: payment.razorpayPaymentId,
      amount: refundType === 'PARTIAL' ? finalRefundAmount : undefined,
      notes: {
        order_id: orderId.toString(),
        reason: reason || 'Customer request',
        refund_type: refundType,
      },
      receipt: `refund_${orderId}_${Date.now()}`,
    });

    // 13. Mark refund as success
    await refund.markSuccess(gatewayRefund.refund_id, gatewayRefund);

    // 14. 🔒 Restore inventory for full refunds or cancellations
    if (refundType === 'FULL' && order.items && order.items.length > 0) {
      try {
        const restoredItems = [];

        for (const item of order.items) {
          await restoreStock(item.productId, item.quantity);
          restoredItems.push({
            productId: item.productId,
            quantity: item.quantity,
          });
        }

        await refund.markInventoryRestored(restoredItems);
        logger.info('Inventory restored after full refund', {
          orderId,
          refundId: refund._id,
          itemCount: restoredItems.length,
        });
      } catch (inventoryErr) {
        logger.error('Failed to restore inventory after refund', {
          orderId,
          refundId: refund._id,
          error: inventoryErr.message,
        });
        // Don't fail refund if inventory restoration fails
      }
    }

    // 15. Update order status for full refunds
    if (refundType === 'FULL') {
      order.paymentStatus = 'REFUNDED';
      order.status = 'CANCELLED';
      await order.save();
    }

    logger.info('Refund completed successfully', {
      orderId,
      refundId: refund._id,
      amount: finalRefundAmount,
      refundType,
      razorpayRefundId: gatewayRefund.refund_id,
    });

    return refund;
  } catch (error) {
    // Mark refund as failed
    await refund.markFailed({
      message: error.message,
      code: error.code || 'REFUND_FAILED',
    });

    logger.error('Refund processing failed', {
      orderId,
      refundId: refund._id,
      error: error.message,
      stack: error.stack,
    });

    throw new AppError(`Refund failed: ${error.message}`, 500);
  }
};

/**
 * Get refund history for an order
 */
export const getRefundHistory = async (orderId) => {
  const refunds = await Refund.find({ orderId }).sort({ createdAt: -1 }).populate('initiatedBy', 'name email');

  return refunds;
};

/**
 * Get refund by ID
 */
export const getRefundById = async (refundId) => {
  const refund = await Refund.findById(refundId)
    .populate('orderId')
    .populate('paymentId')
    .populate('initiatedBy', 'name email');

  if (!refund) {
    throw new AppError('Refund not found', 404);
  }

  return refund;
};
