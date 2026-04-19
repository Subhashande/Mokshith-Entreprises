import * as repo from './settings.repository.js';

export const updateSetting = (key, value) =>
  repo.upsertSetting(key, value);

export const fetchSetting = (key) =>
  repo.getSetting(key);import * as repo from './settings.repository.js';
import AppError from '../../errors/AppError.js';

// 🔥 Allowed keys (for safety)
const ALLOWED_KEYS = [
  'MAINTENANCE_MODE',
  'MAX_ORDER_LIMIT',
  'DEFAULT_CURRENCY',
  'ENABLE_NOTIFICATIONS',
];

export const updateSetting = async (key, value) => {
  if (!key) {
    throw new AppError('Setting key is required', 400);
  }

  // 🔥 Optional strict control
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Invalid setting key', 400);
  }

  return repo.upsertSetting(key, value);
};

export const fetchSetting = async (key) => {
  const setting = await repo.getSetting(key);

  if (!setting) {
    return {
      key,
      value: null,
    };
  }

  return setting;
};

export const getAllSettings = async () => {
  return repo.getAllSettings();
};