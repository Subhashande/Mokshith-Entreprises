import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './pricing.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getPrice = asyncHandler(async (req, res) => {
  const data = await service.getPrice(req.body);

  successResponse(res, data, 'Price calculated');
});