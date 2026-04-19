import { asyncHandler } from '../../utils/asyncHandler.js';
import * as auditService from './audit.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await auditService.fetchLogs(req.query);
  successResponse(res, logs);
});

export const getLogById = asyncHandler(async (req, res) => {
  const log = await auditService.fetchLogById(req.params.id);
  successResponse(res, log);
});