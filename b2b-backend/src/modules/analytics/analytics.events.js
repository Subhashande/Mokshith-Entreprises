import { logger } from '../../config/logger.js';

export const trackEvent = (event, data) => {
  logger.info(`Analytics Event: ${event}`, data);
};

export const trackOrder = (order) => {
  trackEvent('ORDER_CREATED', order);
};