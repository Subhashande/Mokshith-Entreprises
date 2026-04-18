import Audit from '../modules/audit/audit.model.js';

export const logAction = async (data) => {
  try {
    return await Audit.create(data);
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};