import { razorpay } from '../../config/razorpay.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';

export const createPaymentOrder = async ({ amount, currency = 'INR', receipt }) => {
  // Ensure amount is a number and convert to paise
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    throw new Error('Invalid amount provided for payment');
  }

  const options = {
    amount: Math.round(numericAmount * 100), // amount in the smallest currency unit (paise for INR)
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    return {
      id: order.id, // Razorpay order ID
      order_id: order.id, // Alias for frontend convenience
      gatewayOrderId: order.id, // Legacy alias
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    };
  } catch (error) {
    console.error('Razorpay Error Detail:', {
      message: error.message,
      code: error.code,
      description: error.description,
      options
    });
    
    // If it's a validation error from Razorpay (like amount too small), return 400
    if (error.code === 'BAD_REQUEST_ERROR' || error.statusCode === 400) {
      throw new Error(`Razorpay validation failed: ${error.description || error.message}`);
    }
    
    throw new Error(`Razorpay order creation failed: ${error.message || 'Unknown error'}`);
  }
};

export const verifyPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest('hex');

  if (razorpay_signature === expectedSign) {
    return true;
  }
  return false;
};

export const verifyWebhookSignature = (rawBody, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return signature === expectedSignature;
};