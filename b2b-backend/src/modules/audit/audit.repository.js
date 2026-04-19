import Audit from './audit.model.js';

export const createLog = async (data) => {
  return Audit.create(data);
};

export const getLogs = async (filter = {}) => {
  return Audit.find(filter).sort({ createdAt: -1 });
};

export const getLogById = async (id) => {
  return Audit.findById(id);
};