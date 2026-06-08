import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redisConnection.js';
import { QUEUE_NAMES } from '../constants/queueNames.js';

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: getRedisConnection(),
});
