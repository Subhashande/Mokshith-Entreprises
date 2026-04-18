import * as repo from './settings.repository.js';

export const updateSetting = (key, value) =>
  repo.upsertSetting(key, value);

export const fetchSetting = (key) =>
  repo.getSetting(key);