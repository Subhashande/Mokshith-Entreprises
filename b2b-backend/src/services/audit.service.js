import Audit from '../modules/audit/audit.model.js';

export const logAction = async (data) => {
  return Audit.create(data);
};