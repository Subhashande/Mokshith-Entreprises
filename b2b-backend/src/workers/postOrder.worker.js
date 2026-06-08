import { Worker } from 'bullmq';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { getBullMQConnection } from '../config/redis.js';

const connection = getBullMQConnection();

const postOrderWorker = new Worker(
  'post-order',
  async (job) => {
    const { orderId, userId, paymentMethod } = job.data;

    logger.info('Processing post-order job', {
      jobId: job.id,
      orderId,
      userId,
      paymentMethod,
    });

    try {
      // Import services dynamically
      const { createShipment, assignDelivery } = await import('../modules/order/order.service.js');
      const Warehouse = (await import('../modules/warehouse/warehouse.model.js')).default;
      const Order = (await import('../modules/order/order.model.js')).default;

      // Create shipment
      try {
        const warehouses = await Warehouse.find().limit(1).lean();
        if (warehouses.length > 0) {
          const order = await Order.findById(orderId);
          if (order) {
            const shipment = await createShipment(order, warehouses);
            await Order.findByIdAndUpdate(orderId, { shipmentId: shipment._id });
            logger.info('Shipment created', { orderId, shipmentId: shipment._id });
          }
        }
      } catch (shipmentErr) {
        logger.error('Shipment creation failed', {
          orderId,
          error: shipmentErr.message,
        });
        // Continue with delivery assignment even if shipment fails
      }

      // Auto-assign delivery partner
      try {
        const order = await Order.findById(orderId);
        if (order) {
          await assignDelivery(order);
          logger.info('Delivery partner assigned', { orderId, jobId: job.id });
        }
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
      logger.error('Post-order job failed', {
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
    concurrency: 3, // Process 3 jobs concurrently
    limiter: {
      max: 30, // Max 30 jobs
      duration: 60000, // Per 60 seconds
    },
  }
);

// Event handlers
postOrderWorker.on('completed', (job, result) => {
  logger.info('Post-order job completed', {
    jobId: job.id,
    orderId: result.orderId,
    duration: Date.now() - job.timestamp,
  });
});

postOrderWorker.on('failed', (job, err) => {
  logger.error('Post-order job failed permanently', {
    jobId: job?.id,
    orderId: job?.data?.orderId,
    attemptsMade: job?.attemptsMade,
    error: err.message,
  });
});

postOrderWorker.on('error', (err) => {
  logger.error('Post-order worker error', { error: err.message });
});

export { postOrderWorker };
