import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './analytics.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await service.getDashboardStats();
  successResponse(res, data);
});