import { createQueue } from '../../config/queue.js';
import { QUEUE_NAMES } from '../../constants/queueNames.js';

export const notificationQueue = createQueue(
  QUEUE_NAMES.NOTIFICATION
);