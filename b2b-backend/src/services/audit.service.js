import Audit from '../modules/audit/audit.model.js';
import { logger } from '../config/logger.js';

export const logAction = async (data) => {
  try {
    return await Audit.create(data);
  } catch (err) {
    logger.error('Audit log failed:', err.message);
  }
};