import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './category.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const createCategory = asyncHandler(async (req, res) => {
  const category = await service.createCategory(req.body);
  successResponse(res, category, 'Category created');
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await service.getCategories();
  successResponse(res, categories);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await service.getCategoryById(req.params.id);
  successResponse(res, category);
});