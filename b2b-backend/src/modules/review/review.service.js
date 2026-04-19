import * as repo from './review.repository.js';
import AppError from '../../errors/AppError.js';

export const addReview = async (userId, data) => {
  const existing = await repo.findByUserAndProduct(
    userId,
    data.productId
  );

  if (existing) {
    throw new AppError('You already reviewed this product', 400);
  }

  return repo.createReview({
    ...data,
    userId,
  });
};

export const getProductReviews = async (productId) => {
  return repo.findByProduct(productId);
};