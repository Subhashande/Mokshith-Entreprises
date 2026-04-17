import { calculatePrice } from './pricing.engine.js';

export const getPrice = async ({ price, quantity }) => {
  const finalPrice = calculatePrice({
    basePrice: price,
    quantity,
  });

  return {
    original: price,
    final: finalPrice,
  };
};