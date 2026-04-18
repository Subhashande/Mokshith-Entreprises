import * as repo from './audit.repository.js';

export const logAction = async (data) => {
  return repo.createLog(data);
};