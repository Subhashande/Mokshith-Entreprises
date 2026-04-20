import { Worker } from 'bullmq';
import { sendEmail } from '../services/email.service.js';
import { sendSMS } from '../services/sms.service.js';
import { logger } from '../config/logger.js';
import { QUEUE_NAMES } from '../constants/queueNames.js';
import redis from '../config/redis.js';

const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATION,
  async (job) => {
    const { userId, title, message, email, phone, type } = job.data;

    logger.info(`Processing notification for user ${userId}: ${title}`);

    try {
      if (email) {
        await sendEmail({
          to: email,
          subject: title,
          message: message,
        });
      }

      if (phone) {
        await sendSMS({
          phone: phone,
          message: `${title}: ${message}`,
        });
      }
    } catch (error) {
      logger.error(`Notification failed for user ${userId}:`, error);
      throw error;
    }
  },
  { connection: redis }
);

notificationWorker.on('completed', (job) => {
  logger.info(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`Notification job ${job.id} failed:`, err);
});

export default notificationWorker;
