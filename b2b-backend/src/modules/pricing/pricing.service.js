import { calculatePrice } from './pricing.engine.js';
import * as repo from './pricing.repository.js';
import AppError from '../../errors/AppError.js';

export const getPrice = async ({ price, quantity }) => {
  if (!price || price <= 0) {
    throw new AppError('Invalid price', 400);
  }

  if (!quantity || quantity <= 0) {
    throw new AppError('Invalid quantity', 400);
  }

  //  Future: fetch rules from DB
  await repo.getPricingRules();

  const finalPrice = calculatePrice({
    basePrice: price,
    quantity,
  });

  return {
    original: price,
    final: finalPrice,
    quantity,
    discount: price - finalPrice,
  };
};