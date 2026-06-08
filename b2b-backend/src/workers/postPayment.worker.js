import { Worker } from 'bullmq';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { getRedisConnection } from '../config/redisConnection.js';

const connection = getRedisConnection();

const postPaymentWorker = new Worker(
  'post-payment',
  async (job) => {
    const { orderId, userId, amount, paymentMethod } = job.data;

    logger.info('Processing post-payment job', {
      jobId: job.id,
      orderId,
      userId,
      amount,
      paymentMethod,
    });

    try {
      // Import services dynamically to avoid circular dependencies
      const { generateInvoice } = await import('../modules/invoice/invoice.service.js');
      const { autoAssignDelivery } = await import('../modules/logistics/logistics.service.js');

      // Generate invoice
      try {
        await generateInvoice(orderId);
        logger.info('Invoice generated', { orderId, jobId: job.id });
      } catch (invoiceErr) {
        logger.error('Invoice generation failed', {
          orderId,
          error: invoiceErr.message,
          stack: invoiceErr.stack,
        });
        // Don't fail job if only invoice fails
      }

      // Auto-assign delivery
      try {
        await autoAssignDelivery(orderId);
        logger.info('Delivery assigned', { orderId, jobId: job.id });
      } catch (deliveryErr) {
        logger.error('Delivery assignment failed', {
          orderId,
          error: deliveryErr.message,
          stack: deliveryErr.stack,
        });
        // Retry will happen automatically
        throw deliveryErr;
      }

      return { success: true, orderId, timestamp: Date.now() };
    } catch (error) {
      logger.error('Post-payment job failed', {
        jobId: job.id,
        orderId,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 50, // Max 50 jobs
      duration: 60000, // Per 60 seconds
    },
  }
);

// Event handlers
postPaymentWorker.on('completed', (job, result) => {
  logger.info('Post-payment job completed', {
    jobId: job.id,
    orderId: result.orderId,
    duration: Date.now() - job.timestamp,
  });
});

postPaymentWorker.on('failed', (job, err) => {
  logger.error('Post-payment job failed permanently', {
    jobId: job?.id,
    orderId: job?.data?.orderId,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  });
});

postPaymentWorker.on('error', (err) => {
  logger.error('Post-payment worker error', { error: err.message });
});

export { postPaymentWorker };
