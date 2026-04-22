import { razorpay } from '../../config/razorpay.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';

export const createPaymentOrder = async ({ amount, currency = 'INR', receipt }) => {
  const options = {
    amount: amount * 100, // amount in the smallest currency unit (paise for INR)
    currency,
    receipt,
  };

  try {
    const order = await razorpay.orders.create(options);
    return {
      gatewayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (error) {
    console.error('Razorpay Error:', error);
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