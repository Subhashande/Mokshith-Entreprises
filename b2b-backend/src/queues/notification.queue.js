import { Queue } from 'bullmq';
import { getBullMQConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queueNames.js';

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: getBullMQConnection(),
});
