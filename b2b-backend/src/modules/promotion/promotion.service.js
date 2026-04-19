import * as repo from './promotion.repository.js';
import AppError from '../../errors/AppError.js';

export const applyCoupon = async (code, amount) => {
  if (!code) {
    throw new AppError('Coupon code required', 400);
  }

  if (!amount || amount <= 0) {
    throw new AppError('Invalid amount', 400);
  }

  const promo = await repo.findByCode(code);

  if (!promo) throw new AppError('Invalid coupon', 400);

  // 🔥 Check expiry
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    throw new AppError('Coupon expired', 400);
  }

  let discount = 0;

  if (promo.discountType === 'PERCENTAGE') {
    discount = (amount * promo.value) / 100;

    // 🔥 Apply max cap
    if (promo.maxDiscount) {
      discount = Math.min(discount, promo.maxDiscount);
    }
  } else {
    discount = promo.value;
  }

  // 🔥 Prevent negative final amount
  const finalAmount = Math.max(amount - discount, 0);

  return {
    originalAmount: amount,
    discount,
    finalAmount,
    code: promo.code,
  };
};