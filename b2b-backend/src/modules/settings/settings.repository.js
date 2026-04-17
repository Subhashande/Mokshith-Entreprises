import Settings from './settings.model.js';

export const upsertSetting = (key, value) =>
  Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );

export const getSetting = (key) =>
  Settings.findOne({ key });