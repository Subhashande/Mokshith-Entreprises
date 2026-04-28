import { asyncHandler } from '../../utils/asyncHandler.js';
import * as analyticsService from './analytics.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats();
  successResponse(res, data);
});

export const getSales = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats(req.query);
  successResponse(res, data);
});

export const getOrdersTrends = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats(req.query);
  successResponse(res, data);
});

export const getCategories = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats();
  successResponse(res, data);
});

export const getTopProducts = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats(req.query);
  successResponse(res, data);
});

export const getRevenue = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardStats(req.query);
  successResponse(res, data);
});