import Audit from './audit.model.js';

export const createLog = (data) => Audit.create(data);