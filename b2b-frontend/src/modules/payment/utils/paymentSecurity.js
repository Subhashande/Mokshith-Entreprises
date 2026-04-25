/**
 * Payment Security Utilities
 * Handles validation, verification, and secure payment operations
 */

/**
 * Validate Razorpay response contains all required fields
 * @param {Object} response - Razorpay payment response
 * @returns {Object} - Validation result with { isValid, errors }
 */
export const validateRazorpayResponse = (response) => {
  const errors = [];

  // Check required fields
  if (!response.razorpay_order_id) errors.push('Missing order ID from payment gateway');
  if (!response.razorpay_payment_id) errors.push('Missing payment ID from payment gateway');
  if (!response.razorpay_signature) errors.push('Missing signature from payment gateway');

  // Check field types and format
  if (response.razorpay_order_id && typeof response.razorpay_order_id !== 'string') {
    errors.push('Invalid order ID format');
  }
  if (response.razorpay_payment_id && typeof response.razorpay_payment_id !== 'string') {
    errors.push('Invalid payment ID format');
  }
  if (response.razorpay_signature && typeof response.razorpay_signature !== 'string') {
    errors.push('Invalid signature format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate payment amount is correct
 * @param {number} expectedAmount - Expected amount in paise
 * @param {number} actualAmount - Actual amount in paise
 * @param {number} tolerance - Tolerance in paise (default: 0)
 * @returns {boolean} - True if amount matches within tolerance
 */
export const validatePaymentAmount = (expectedAmount, actualAmount, tolerance = 0) => {
  if (typeof expectedAmount !== 'number' || typeof actualAmount !== 'number') {
    console.error('❌ Invalid amount types for validation');
    return false;
  }

  const difference = Math.abs(expectedAmount - actualAmount);
  return difference <= tolerance;
};

/**
 * Sanitize payment data before sending to backend
 * @param {Object} paymentData - Payment data object
 * @returns {Object} - Sanitized payment data
 */
export const sanitizePaymentData = (paymentData) => {
  return {
    orderId: String(paymentData.orderId || '').trim(),
    razorpay_order_id: String(paymentData.razorpay_order_id || '').trim(),
    razorpay_payment_id: String(paymentData.razorpay_payment_id || '').trim(),
    razorpay_signature: String(paymentData.razorpay_signature || '').trim(),
  };
};

/**
 * Detect and prevent duplicate payment processing
 * Uses sessionStorage to track processed payments
 */
export const PaymentDuplicateDetector = (() => {
  const STORAGE_KEY = 'mokshith_payments_processed';
  const STORAGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  return {
    /**
     * Check if payment was already processed
     */
    isDuplicate: (paymentId) => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (!stored) return false;

        const payments = JSON.parse(stored);
        const payment = payments[paymentId];

        if (!payment) return false;

        // Check if entry is still valid (within timeout)
        const now = Date.now();
        if (now - payment.timestamp > STORAGE_TIMEOUT) {
          delete payments[paymentId];
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
          return false;
        }

        return true;
      } catch (err) {
        console.error('❌ Error checking duplicate payment:', err);
        return false;
      }
    },

    /**
     * Mark payment as processed
     */
    markProcessed: (paymentId) => {
      try {
        let payments = {};
        const stored = sessionStorage.getItem(STORAGE_KEY);

        if (stored) {
          payments = JSON.parse(stored);
        }

        payments[paymentId] = {
          timestamp: Date.now(),
          processedAt: new Date().toISOString()
        };

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
        console.log('✅ Payment marked as processed:', paymentId);
      } catch (err) {
        console.error('❌ Error marking payment as processed:', err);
      }
    },

    /**
     * Clear all processed payments
     */
    clear: () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('✅ Payment history cleared');
      } catch (err) {
        console.error('❌ Error clearing payment history:', err);
      }
    }
  };
})();

/**
 * Payment error handler
 * Provides user-friendly error messages
 */
export const PaymentErrorHandler = {
  /**
   * Parse error and return user-friendly message
   */
  getMessage: (error) => {
    if (typeof error === 'string') {
      return error;
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      // Map common errors to user-friendly messages
      const messageMap = {
        'Payment verification failed': 'Payment verification failed. Please try again or contact support.',
        'Order not found': 'Order not found. Please refresh and try again.',
        'Invalid order ID': 'Invalid order. Please refresh and try again.',
        'Network error': 'Network error. Please check your connection and try again.',
        'Timeout': 'Request timed out. Please try again.',
        'payment:success': 'Payment successful!',
      };

      return messageMap[error.message] || error.message;
    }

    return 'An unexpected error occurred. Please try again or contact support.';
  },

  /**
   * Check if error is retryable
   */
  isRetryable: (error) => {
    const nonRetryablePatterns = [
      'verification failed',
      'Invalid.*signature',
      'order.*locked',
      'payment.*already.*processed'
    ];

    const errorStr = (error.message || error.toString()).toLowerCase();
    return !nonRetryablePatterns.some(pattern => 
      new RegExp(pattern, 'i').test(errorStr)
    );
  }
};

/**
 * Payment logger for debugging
 */
export const PaymentLogger = {
  log: (action, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[PAYMENT ${timestamp}] ${action}:`, data);
  },

  error: (action, error) => {
    const timestamp = new Date().toISOString();
    console.error(`[PAYMENT ERROR ${timestamp}] ${action}:`, error);
  },

  debug: (action, data) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[PAYMENT DEBUG ${timestamp}] ${action}:`, data);
    }
  }
};

/**
 * Razorpay configuration validator
 */
export const validateRazorpayConfig = () => {
  const errors = [];

  if (!window.Razorpay) {
    errors.push('Razorpay SDK not loaded. Ensure script is included in HTML.');
  }

  if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
    errors.push('Razorpay Key ID not configured. Set VITE_RAZORPAY_KEY_ID environment variable.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validateRazorpayResponse,
  validatePaymentAmount,
  sanitizePaymentData,
  PaymentDuplicateDetector,
  PaymentErrorHandler,
  PaymentLogger,
  validateRazorpayConfig
};
