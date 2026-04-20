import { Queue } from 'bullmq';
import redis from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queueNames.js';

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: redis,
});
