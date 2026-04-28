import { razorpay } from '../../config/razorpay.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

// Circuit Breaker State
const circuitBreaker = {
  failures: 0,
  lastFailure: null,
  threshold: 5,
  cooldown: 60000, // 1 minute
  isOpen: false
};

const checkCircuit = () => {
  if (circuitBreaker.isOpen) {
    const now = Date.now();
    if (now - circuitBreaker.lastFailure > circuitBreaker.cooldown) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      return true;
    }
    return false;
  }
  return true;
};

const recordFailure = () => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.isOpen = true;
  }
};

const recordSuccess = () => {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
};

/**
 * Creates a Razorpay order for payment processing
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in INR (will be converted to paise)
 * @param {string} params.currency - Currency code (default: INR)
 * @param {string} params.receipt - Unique receipt identifier
 * @returns {Promise<Object>} Razorpay order with required fields
 */
export const createPaymentOrder = async ({ amount, currency = 'INR', receipt }) => {
  if (!checkCircuit()) {
    throw new Error('Payment gateway is temporarily unavailable (Circuit Breaker). Please try again in a minute.');
  }
  // VALIDATION: Ensure amount is valid
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    throw new Error('Invalid amount provided for payment');
  }

  // VALIDATION: Razorpay minimum is ₹1 (100 paise)
  if (numericAmount < 1) {
    throw new Error('Minimum payment amount is ₹1');
  }

  // VALIDATION: Reasonable maximum (₹10,000,000)
  if (numericAmount > 10000000) {
    throw new Error('Maximum payment amount is ₹1,00,00,000');
  }

  const options = {
    amount: Math.round(numericAmount * 100), // amount in the smallest currency unit (paise for INR)
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
  };

  try {
    logger.info('Creating Razorpay order:', {
      amount: numericAmount,
      amountInPaise: options.amount,
      currency,
      receipt: options.receipt
    });

    const order = await razorpay.orders.create(options);
    recordSuccess();
    
    logger.info('Razorpay order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      receipt: order.receipt
    });

    return {
      id: order.id, // Razorpay order ID
      order_id: order.id, // Alias for frontend convenience
      gatewayOrderId: order.id, // Legacy alias
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status
    };
  } catch (error) {
    recordFailure();
    console.error('RAZORPAY ERROR:', {
      message: error.message,
      code: error.code,
      description: error.description,
      statusCode: error.statusCode,
      options: options,
      errorFull: error
    });
    
    // If it's a validation error from Razorpay (like amount too small), return 400
    if (error.code === 'BAD_REQUEST_ERROR' || error.statusCode === 400) {
      throw new Error(`Razorpay validation failed: ${error.description || error.message}`);
    }
    
    // Network or service errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      throw new Error('Razorpay service temporarily unavailable. Please try again.');
    }

    throw new Error(`Razorpay order creation failed: ${error.description || error.message || 'Unknown error'}`);
  }
};

/**
 * Verifies a Razorpay payment signature using HMAC-SHA256
 * @param {Object} params - Verification parameters
 * @param {string} params.razorpay_order_id - Razorpay order ID
 * @param {string} params.razorpay_payment_id - Razorpay payment ID
 * @param {string} params.razorpay_signature - Signature from Razorpay
 * @returns {boolean} True if signature is valid
 */
export const verifyPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  try {
    // VALIDATION: Check required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing payment verification fields', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        hasSignature: !!razorpay_signature
      });
      return false;
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    const isValid = razorpay_signature === expectedSign;
    
    if (isValid) {
      console.log('Payment signature verified successfully');
    } else {
      console.error('Payment signature verification failed:', {
        received: razorpay_signature,
        expected: expectedSign,
        sign
      });
    }

    return isValid;
  } catch (error) {
    console.error('Error during payment verification:', error.message);
    return false;
  }
};

/**
 * Verifies a Razorpay webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - X-Razorpay-Signature header value
 * @param {string} secret - Webhook secret from environment
 * @returns {boolean} True if webhook signature is valid
 */
export const verifyWebhookSignature = (rawBody, signature, secret) => {
  try {
    if (!secret) {
      console.error('Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.error('Webhook signature mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error.message);
    return false;
  }
};