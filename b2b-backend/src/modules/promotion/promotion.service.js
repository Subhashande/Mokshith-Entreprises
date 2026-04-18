import * as repo from './promotion.repository.js';
import AppError from '../../errors/AppError.js';

export const applyCoupon = async (code, amount) => {
  const promo = await repo.findByCode(code);

  if (!promo) throw new AppError('Invalid coupon', 400);

  let discount = 0;

  if (promo.discountType === 'PERCENTAGE') {
    discount = (amount * promo.value) / 100;
  } else {
    discount = promo.value;
  }

  return {
    finalAmount: amount - discount,
    discount,
  };
};