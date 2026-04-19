import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './wishlist.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const addToWishlist = asyncHandler(async (req, res) => {
  const data = await service.addToWishlist(
    req.user.id,
    req.body.productId
  );

  successResponse(res, data, 'Added to wishlist');
});

export const getWishlist = asyncHandler(async (req, res) => {
  const data = await service.getWishlist(req.user.id);
  successResponse(res, data);
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const data = await service.removeFromWishlist(
    req.user.id,
    req.params.productId
  );

  successResponse(res, data, 'Removed from wishlist');
});