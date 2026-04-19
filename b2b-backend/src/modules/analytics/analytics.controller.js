import { asyncHandler } from '../../utils/asyncHandler.js';
import * as analyticsService from './analytics.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats();
  successResponse(res, data);
});