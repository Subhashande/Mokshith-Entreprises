import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './search.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const searchProducts = asyncHandler(async (req, res) => {
  const results = await service.searchProducts(req.query.q);

  successResponse(res, results);
});