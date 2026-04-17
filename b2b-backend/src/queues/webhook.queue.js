import { createQueue } from '../config/queue.js';

export const webhookQueue = createQueue('webhookQueue');