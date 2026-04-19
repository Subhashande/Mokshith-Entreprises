import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './review.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const addReview = asyncHandler(async (req, res) => {
  const review = await service.addReview(req.user.id, req.body);
  successResponse(res, review, 'Review added');
});

export const getReviews = asyncHandler(async (req, res) => {
  const reviews = await service.getProductReviews(req.params.productId);
  successResponse(res, reviews);
});