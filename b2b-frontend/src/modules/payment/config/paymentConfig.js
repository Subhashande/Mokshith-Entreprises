/**
 * Production-Ready Payment Configuration
 * Includes retry logic, payment tracking, error handling, and monitoring
 */

/**
 * Payment Configuration
 */
export const PAYMENT_CONFIG = {
  // Razorpay Settings
  RAZORPAY: {
    TIMEOUT: 600000, // 10 minutes
    AUTO_RETRY: true,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
  },

  // Payment Limits
  LIMITS: {
    MIN_AMOUNT: 1, // ₹1
    MAX_AMOUNT: 10000000, // ₹1,00,00,000
  },

  // Validation Settings
  VALIDATION: {
    AMOUNT_TOLERANCE: 1, // ₹1 tolerance
    VERIFY_TIMEOUT: 30000, // 30 seconds
  },

  // Error Messages
  ERRORS: {
    NETWORK: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Payment timeout. Please try again.',
    VERIFICATION_FAILED: 'Payment verification failed. Please contact support.',
    INVALID_RESPONSE: 'Invalid payment response. Please try again.',
    DUPLICATE_PAYMENT: 'This payment is being processed. Please wait.',
    ORDER_NOT_FOUND: 'Order not found. Please refresh and try again.',
    AMOUNT_MISMATCH: 'Amount mismatch detected. Please refresh and try again.',
    RAZORPAY_CONFIG: 'Payment system not configured. Please contact support.',
    INSUFFICIENT_CREDIT: 'Insufficient credit available.',
    PAYMENT_LOCKED: 'This order is locked for payment. Please contact support.',
  },

  // Success Messages
  SUCCESS: {
    ORDER_PAID: 'Order paid successfully!',
    INVOICE_GENERATED: 'Invoice generated successfully.',
    DELIVERY_ASSIGNED: 'Delivery partner assigned.',
  },
};

/**
 * Payment Status Tracker
 * Tracks payment attempts and results
 */
export class PaymentStatusTracker {
  constructor() {
    this.payments = new Map();
  }

  /**
   * Track payment attempt
   */
  trackAttempt(orderId, attempt = {}) {
    const key = `payment_${orderId}`;
    const existing = this.payments.get(key) || {
      orderId,
      attempts: [],
      lastAttemptTime: null,
      status: 'PENDING'
    };

    existing.attempts.push({
      timestamp: Date.now(),
      status: attempt.status || 'INITIATED',
      error: attempt.error || null,
      paymentId: attempt.paymentId || null,
    });

    existing.lastAttemptTime = Date.now();
    this.payments.set(key, existing);

    return existing;
  }

  /**
   * Get payment history
   */
  getHistory(orderId) {
    const key = `payment_${orderId}`;
    return this.payments.get(key);
  }

  /**
   * Update payment status
   */
  updateStatus(orderId, status) {
    const key = `payment_${orderId}`;
    const existing = this.payments.get(key);
    if (existing) {
      existing.status = status;
      this.payments.set(key, existing);
    }
  }

  /**
   * Clear payment tracking
   */
  clear(orderId) {
    if (orderId) {
      this.payments.delete(`payment_${orderId}`);
    } else {
      this.payments.clear();
    }
  }
}

/**
 * Retry Logic Handler
 */
export class PaymentRetryHandler {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 2000;
    this.retries = new Map();
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry(fn, context = 'payment') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxRetries}: ${context}`);
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryable(error);
        
        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }

        // Calculate exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`⚠️ Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    const nonRetryablePatterns = [
      'verification failed',
      'invalid.*signature',
      'order.*locked',
      'already.*processed',
      '403', // Forbidden
      '401', // Unauthorized
    ];

    const errorStr = (error.message || error.toString()).toLowerCase();
    return !nonRetryablePatterns.some(pattern => 
      new RegExp(pattern, 'i').test(errorStr)
    );
  }

  /**
   * Get retry count
   */
  getRetryCount(key) {
    return this.retries.get(key) || 0;
  }

  /**
   * Increment retry count
   */
  incrementRetry(key) {
    this.retries.set(key, (this.retries.get(key) || 0) + 1);
  }

  /**
   * Reset retry count
   */
  resetRetry(key) {
    this.retries.delete(key);
  }
}

/**
 * Payment Analytics
 * Tracks payment metrics for monitoring and debugging
 */
export class PaymentAnalytics {
  constructor() {
    this.metrics = {
      totalAttempts: 0,
      successfulPayments: 0,
      failedPayments: 0,
      averageResponseTime: 0,
      errorBreakdown: {},
      paymentMethodBreakdown: {}
    };
    this.attempts = [];
  }

  /**
   * Record payment attempt
   */
  recordAttempt(data) {
    const {
      orderId,
      amount,
      paymentMethod,
      status,
      error,
      responseTime,
      timestamp
    } = data;

    this.metrics.totalAttempts++;

    if (status === 'SUCCESS') {
      this.metrics.successfulPayments++;
    } else if (status === 'FAILED') {
      this.metrics.failedPayments++;
      if (error) {
        this.metrics.errorBreakdown[error] = (this.metrics.errorBreakdown[error] || 0) + 1;
      }
    }

    if (paymentMethod) {
      this.metrics.paymentMethodBreakdown[paymentMethod] = 
        (this.metrics.paymentMethodBreakdown[paymentMethod] || 0) + 1;
    }

    if (responseTime) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalAttempts - 1) + responseTime) / 
        this.metrics.totalAttempts;
    }

    this.attempts.push({
      orderId,
      amount,
      paymentMethod,
      status,
      error,
      responseTime,
      timestamp: timestamp || Date.now()
    });
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAttempts > 0 
        ? ((this.metrics.successfulPayments / this.metrics.totalAttempts) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Get attempts
   */
  getAttempts(limit = 50) {
    return this.attempts.slice(-limit);
  }

  /**
   * Reset analytics
   */
  reset() {
    this.metrics = {
      totalAttempts: 0,
      successfulPayments: 0,
      failedPayments: 0,
      averageResponseTime: 0,
      errorBreakdown: {},
      paymentMethodBreakdown: {}
    };
    this.attempts = [];
  }
}

/**
 * Global instances for production use
 */
export const paymentStatusTracker = new PaymentStatusTracker();
export const paymentRetryHandler = new PaymentRetryHandler();
export const paymentAnalytics = new PaymentAnalytics();

/**
 * Initialize payment system
 */
export const initializePaymentSystem = () => {
  console.log('🚀 Initializing Payment System');
  console.log('✅ Payment Configuration:', PAYMENT_CONFIG);
  return {
    statusTracker: paymentStatusTracker,
    retryHandler: paymentRetryHandler,
    analytics: paymentAnalytics,
    config: PAYMENT_CONFIG
  };
};

export default {
  PAYMENT_CONFIG,
  PaymentStatusTracker,
  PaymentRetryHandler,
  PaymentAnalytics,
  paymentStatusTracker,
  paymentRetryHandler,
  paymentAnalytics,
  initializePaymentSystem
};
