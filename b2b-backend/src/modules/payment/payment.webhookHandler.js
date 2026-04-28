import { logger } from '../../config/logger.js';
import { verifyPayment } from './payment.service.js';

/**
 * Webhook Retry Configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * In-memory retry queue (for production, use Redis or database)
 */
const retryQueue = new Map();

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelay
  );
  return delay;
}

/**
 * Process webhook with retry mechanism
 */
async function processWebhookWithRetry(payload, attempt = 0) {
  try {
    logger.info(`Processing webhook attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`, {
      event: payload.event,
      payment_id: payload.payload?.payment?.entity?.id
    });

    await verifyPayment(payload);
    
    logger.info('Webhook processed successfully', {
      event: payload.event,
      payment_id: payload.payload?.payment?.entity?.id
    });

    // Remove from retry queue if successful
    const paymentId = payload.payload?.payment?.entity?.id;
    if (paymentId && retryQueue.has(paymentId)) {
      retryQueue.delete(paymentId);
    }

    return { success: true };
  } catch (error) {
    logger.error(`Webhook processing failed (attempt ${attempt + 1})`, {
      event: payload.event,
      error: error.message,
      payment_id: payload.payload?.payment?.entity?.id
    });

    // Retry logic
    if (attempt < RETRY_CONFIG.maxRetries) {
      const delay = getRetryDelay(attempt);
      const paymentId = payload.payload?.payment?.entity?.id;

      logger.info(`Scheduling retry after ${delay}ms`, { payment_id: paymentId });

      // Store in retry queue
      if (paymentId) {
        retryQueue.set(paymentId, {
          payload,
          attempt: attempt + 1,
          nextRetry: Date.now() + delay,
          error: error.message
        });
      }

      // Schedule retry
      setTimeout(async () => {
        await processWebhookWithRetry(payload, attempt + 1);
      }, delay);

      return { success: false, willRetry: true, nextRetryIn: delay };
    }

    // Max retries exceeded
    logger.error('Webhook processing failed after all retries', {
      event: payload.event,
      payment_id: payload.payload?.payment?.entity?.id,
      attempts: attempt + 1,
      finalError: error.message
    });

    // TODO: Store failed webhooks in database for manual recovery
    // await storeFailedWebhook(payload, error);

    return { success: false, willRetry: false, error: error.message };
  }
}

/**
 * Main webhook handler with retry mechanism
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const payload = req.body;

    // Log webhook receipt
    logger.info('Webhook received', {
      event: payload.event,
      payment_id: payload.payload?.payment?.entity?.id
    });

    // Check if already in retry queue (idempotency)
    const paymentId = payload.payload?.payment?.entity?.id;
    if (paymentId && retryQueue.has(paymentId)) {
      logger.warn('Webhook already being processed', { payment_id: paymentId });
      return res.status(200).json({ 
        success: true, 
        message: 'Already processing' 
      });
    }

    // Process webhook (async, will retry if needed)
    const result = await processWebhookWithRetry(payload);

    // Always return 200 to Razorpay to prevent their retries
    // We handle retries internally
    res.status(200).json({ 
      success: true,
      processed: result.success,
      ...(result.willRetry && { retrying: true })
    });
  } catch (err) {
    logger.error('Webhook handler error:', err);

    // Return 200 to prevent Razorpay retries
    // Log for investigation
    res.status(200).json({ 
      success: false, 
      error: 'Internal error - logged for investigation' 
    });
  }
};

/**
 * Get retry queue status (for monitoring)
 */
export const getRetryQueueStatus = () => {
  const now = Date.now();
  const entries = Array.from(retryQueue.entries()).map(([paymentId, data]) => ({
    paymentId,
    attempt: data.attempt,
    nextRetry: data.nextRetry,
    secondsUntilRetry: Math.max(0, Math.floor((data.nextRetry - now) / 1000)),
    error: data.error
  }));

  return {
    queueSize: retryQueue.size,
    entries
  };
};
