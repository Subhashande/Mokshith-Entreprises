import Review from './review.model.js';

export const createReview = (data) => Review.create(data);

export const findByProduct = (productId) =>
  Review.find({ productId }).populate('userId', 'name');

export const findByUserAndProduct = (userId, productId) =>
  Review.findOne({ userId, productId });