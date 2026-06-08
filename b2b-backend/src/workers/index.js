import { Worker } from 'bullmq';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { getBullMQConnection } from '../config/redis.js';

/**
 * BullMQ Worker Manager for background job processing
 */

let workers = [];
let workersInitialized = false;

// Shared Redis connection for all workers
const connection = getBullMQConnection();

/**
 * Create all worker instances
 */
const createWorkers = () => {
  if (workersInitialized) {
    logger.warn('Workers already initialized, skipping creation');
    return workers;
  }

  logger.info('Workers initializing with centralized BullMQ connection factory', {
    usingRedisUrl: !!env.REDIS_URL,
    redisHost: env.REDIS_HOST,
    redisPort: env.REDIS_PORT
  });

  const newWorkers = [];

  const workerErrorHandler = (workerName, error) => {
    logger.error(`Worker ${workerName} encountered error:`, {
      message: error.message,
      stack: error.stack,
      redisUrlExists: !!env.REDIS_URL
    });
  };

/**
 * Email worker
 */
  const emailWorker = new Worker(
    'email',
    async (job) => {
      const { to, subject, body, html } = job.data;
      
      logger.info('Processing email job', { to, subject, jobId: job.id });
      
      // TODO: Implement actual email sending (SendGrid, AWS SES, etc.)
      // For now, just log
      logger.info('Email sent (mock)', { to, subject });
      
      return { success: true, to, subject };
    },
    {
      connection,
      concurrency: 5, // Process 5 emails concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000 // Per 60 seconds
      },
      settings: {
        backoffStrategy: (attemptsMade) => {
          // Exponential backoff: 5s, 25s, 125s
          return Math.min(5000 * Math.pow(5, attemptsMade), 300000);
        }
      }
    }
  );
  emailWorker.on('error', (err) => workerErrorHandler('email', err));
  logger.info('Worker email using centralized Redis connection');

/**
 * Notification worker
 */
  const notificationWorker = new Worker(
    'notification',
    async (job) => {
      const { userId, type, title, message } = job.data;
      
      logger.info('Processing notification job', { userId, type, jobId: job.id });
      
      // Send notification via Socket.IO
      if (global.io) {
        global.io.to(userId).emit('notification', {
          type,
          title,
          message,
          timestamp: new Date()
        });
      }
      
      return { success: true, userId };
    },
    {
      connection,
      concurrency: 10,
      settings: {
        backoffStrategy: (attemptsMade) => {
          return 3000 * Math.pow(2, attemptsMade); // 3s, 6s, 12s
        }
      }
    }
  );
  notificationWorker.on('error', (err) => workerErrorHandler('notification', err));
  logger.info('Worker notification using centralized Redis connection');

  // ... inventory, payment, webhook, audit, image-processing, data-archival ...

/**
 * Inventory worker
 */
  const inventoryWorker = new Worker(
    'inventory',
    async (job) => {
      logger.info('Processing inventory job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  inventoryWorker.on('error', (err) => workerErrorHandler('inventory', err));

/**
 * Payment worker
 */
  const paymentWorker = new Worker(
    'payment',
    async (job) => {
      logger.info('Processing payment job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  paymentWorker.on('error', (err) => workerErrorHandler('payment', err));

/**
 * Webhook worker
 */
  const webhookWorker = new Worker(
    'webhook',
    async (job) => {
      logger.info('Processing webhook job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  webhookWorker.on('error', (err) => workerErrorHandler('webhook', err));

/**
 * Audit worker
 */
  const auditWorker = new Worker(
    'audit',
    async (job) => {
      logger.info('Processing audit job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  auditWorker.on('error', (err) => workerErrorHandler('audit', err));

/**
 * Image processing worker
 */
  const imageWorker = new Worker(
    'image-processing',
    async (job) => {
      logger.info('Processing image job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  imageWorker.on('error', (err) => workerErrorHandler('image-processing', err));

/**
 * Data archival worker
 */
  const archivalWorker = new Worker(
    'data-archival',
    async (job) => {
      logger.info('Processing archival job', { jobId: job.id });
      return { success: true };
    },
    { connection }
  );
  archivalWorker.on('error', (err) => workerErrorHandler('data-archival', err));

  newWorkers.push(
    emailWorker, 
    notificationWorker, 
    inventoryWorker, 
    paymentWorker, 
    webhookWorker, 
    auditWorker, 
    imageWorker, 
    archivalWorker
  );

  logger.info(`✅ Created ${newWorkers.length} BullMQ workers using centralized connection`);
  newWorkers.forEach(w => logger.info(`Worker ${w.name} initialized`));

  // 🔒 Production-grade error handlers for all workers
  newWorkers.forEach((worker) => {
  // ✅ Job completed successfully
  worker.on('completed', (job, result) => {
    logger.info(`Worker ${worker.name} completed job`, { 
      jobId: job.id, 
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      duration: Date.now() - job.timestamp
    });
  });

  // ❌ Job failed after all retries
  worker.on('failed', (job, err) => {
    logger.error(`Worker ${worker.name} job failed permanently`, { 
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: err.message,
      stack: err.stack,
      data: job?.data
    });
    
    // TODO: Send alert for critical failed jobs (payment, webhook)
    if (['payment', 'webhook'].includes(worker.name)) {
      logger.error(`CRITICAL: ${worker.name} job failed - manual intervention required`, {
        jobId: job?.id,
        data: job?.data
      });
    }
  });

  // ⚠️ Worker-level error (not job-specific)
  worker.on('error', (err) => {
    logger.error(`Worker ${worker.name} encountered error`, { 
      error: err.message,
      stack: err.stack
    });
  });
  
  // 🕐 Job is taking too long (stalled)
  worker.on('stalled', (jobId) => {
    logger.warn(`Worker ${worker.name} job stalled`, { 
      jobId,
      message: 'Job exceeded processing time, may be stuck'
    });
  });
  
  // 🔄 Job is being retried
  worker.on('progress', (job, progress) => {
    if (job.attemptsMade > 1) {
      logger.info(`Worker ${worker.name} retrying job`, {
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        progress
      });
    }
  });
});

  workers = newWorkers;
  workersInitialized = true;
  
  logger.info(`✅ Created ${workers.length} BullMQ workers`);
  return workers;
};

/**
 * Start all workers
 * 🔥 PHASE 2.5: Comprehensive environment checks
 */
export const startWorkers = () => {
  // 🔥 CRITICAL: Multiple layers of protection
  if (process.env.NODE_ENV === 'test') {
    logger.info('🧪 Test environment detected - workers disabled');
    return [];
  }

  if (process.env.ENABLE_QUEUE === 'false' || process.env.ENABLE_WORKERS === 'false') {
    logger.info('⏸️ Workers disabled via environment flags');
    return [];
  }

  if (workersInitialized) {
    logger.info('Workers already running');
    return workers;
  }

  try {
    logger.info('🚀 Starting BullMQ workers...');
    const createdWorkers = createWorkers();
    logger.info(`✅ Started ${createdWorkers.length} BullMQ workers`);
    return createdWorkers;
  } catch (error) {
    logger.error('❌ Failed to start workers:', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Graceful shutdown for all workers
 */
export const shutdownWorkers = async () => {
  if (workers.length === 0) {
    logger.info('No workers to shut down');
    return;
  }
  
  logger.info('Starting graceful shutdown of BullMQ workers...', { workerCount: workers.length });
  
  const shutdownPromises = workers.map(async (worker) => {
    try {
      logger.info(`Closing worker: ${worker.name}`);
      
      // Close worker gracefully:
      // - Stops accepting new jobs
      // - Waits for active jobs to complete (or timeout)
      // - Closes Redis connection
      await worker.close();
      
      logger.info(`Worker ${worker.name} closed successfully`);
    } catch (error) {
      logger.error(`Failed to close worker ${worker.name}`, { 
        error: error.message,
        stack: error.stack 
      });
      // Continue closing other workers even if one fails
    }
  });
  
  await Promise.allSettled(shutdownPromises);
  
  workers = [];
  workersInitialized = false;
  
  logger.info('✅ All workers shut down gracefully');
};

/**
 * Get current workers (safe accessor)
 */
export const getWorkers = () => {
  return workers;
};

// 🔥 PHASE 2.5: Removed auto-start block that was causing test issues
// Workers now only start when explicitly called via startWorkers()

export { workers };
