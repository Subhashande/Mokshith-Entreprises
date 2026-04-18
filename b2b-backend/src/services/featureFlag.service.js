import { featureFlags } from '../config/featureFlags.js';

export const isFeatureEnabled = (feature) => {
  return featureFlags[feature];
};