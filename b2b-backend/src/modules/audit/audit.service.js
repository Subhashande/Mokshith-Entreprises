import * as repo from './audit.repository.js';

export const logAction = async (data) => {
  return repo.createLog(data);
};

export const fetchLogs = async (query) => {
  const filter = {};

  if (query.userId) filter.userId = query.userId;
  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = query.action;

  return repo.getLogs(filter);
};

export const fetchLogById = async (id) => {
  return repo.getLogById(id);
};