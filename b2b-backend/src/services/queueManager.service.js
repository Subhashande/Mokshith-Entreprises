import { Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { getBullMQConnection } from '../config/redis.js';

/**
 * 🔒 Centralized Redis connection config for BullMQ
 */
const connection = getBullMQConnection();

// Initialize queues
const postPaymentQueue = new Queue('post-payment', { connection });
const postOrderQueue = new Queue('post-order', { connection });

// Log initialization
logger.info('BullMQ Queues initialized with centralized BullMQ connection factory', {
  mode: env.REDIS_URL ? 'URL (Upstash)' : 'Host/Port',
  host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : env.REDIS_HOST,
  redisUrlExists: !!env.REDIS_URL
});

/**
 * Queue post-payment processing jobs (invoice, delivery, notifications)
 * @param {Object} data - Job data
 * @param {string} data.orderId - Order ID
 * @param {string} data.userId - User ID
 * @param {number} data.amount - Payment amount
 * @param {string} data.paymentMethod - Payment method
 */
export const queuePostPaymentJobs = async (data) => {
  try {
    const { orderId, userId, amount, paymentMethod } = data;

    if (!orderId) {
      logger.error('Cannot queue post-payment jobs without orderId', { data });
      return;
    }

    // Add job with retry configuration
    await postPaymentQueue.add(
      'process-payment-completion',
      {
        orderId,
        userId,
        amount,
        paymentMethod,
        timestamp: Date.now(),
      },
      {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 200, // Keep last 200 failed jobs for debugging
      }
    );

    logger.info('Post-payment jobs queued', { orderId, userId });
  } catch (error) {
    logger.error('Failed to queue post-payment jobs', {
      error: error.message,
      data,
      stack: error.stack,
    });
    // Don't throw - post-payment tasks are non-critical
  }
};

/**
 * Queue post-order processing jobs (shipment, delivery assignment)
 * @param {Object} data - Job data
 * @param {string} data.orderId - Order ID
 * @param {string} data.userId - User ID
 * @param {string} data.paymentMethod - Payment method
 */
export const queuePostOrderJobs = async (data) => {
  try {
    const { orderId, userId, paymentMethod } = data;

    if (!orderId) {
      logger.error('Cannot queue post-order jobs without orderId', { data });
      return;
    }

    await postOrderQueue.add(
      'process-order-logistics',
      {
        orderId,
        userId,
        paymentMethod,
        timestamp: Date.now(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000, // 3s, 6s, 12s
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    );

    logger.info('Post-order jobs queued', { orderId, userId });
  } catch (error) {
    logger.error('Failed to queue post-order jobs', {
      error: error.message,
      data,
      stack: error.stack,
    });
  }
};

/**
 * Graceful shutdown
 */
export const closeQueues = async () => {
  try {
    await Promise.all([postPaymentQueue.close(), postOrderQueue.close()]);
    logger.info('Queues closed successfully');
  } catch (error) {
    logger.error('Error closing queues', { error: error.message });
  }
};

export { postPaymentQueue, postOrderQueue };
