import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './promotion.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getPromotions = asyncHandler(async (req, res) => {
  const data = await service.getPromotions();
  successResponse(res, data);
});

export const createPromotion = asyncHandler(async (req, res) => {
  const data = await service.createPromotion(req.body);
  successResponse(res, data, 'Promotion created');
});

export const updatePromotion = asyncHandler(async (req, res) => {
  const data = await service.updatePromotion(req.params.id, req.body);
  successResponse(res, data, 'Promotion updated');
});

export const deletePromotion = asyncHandler(async (req, res) => {
  await service.deletePromotion(req.params.id);
  successResponse(res, null, 'Promotion deleted');
});

export const togglePromotion = asyncHandler(async (req, res) => {
  const data = await service.togglePromotion(req.params.id);
  successResponse(res, data, 'Promotion status toggled');
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const data = await service.applyCoupon(
    req.body.code,
    req.body.amount
  );

  successResponse(res, data, 'Coupon applied');
});