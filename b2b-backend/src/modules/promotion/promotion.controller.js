import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './promotion.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const applyCoupon = asyncHandler(async (req, res) => {
  const data = await service.applyCoupon(
    req.body.code,
    req.body.amount
  );

  successResponse(res, data, 'Coupon applied');
});