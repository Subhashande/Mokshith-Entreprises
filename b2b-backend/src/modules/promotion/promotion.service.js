import * as repo from './promotion.repository.js';
import AppError from '../../errors/AppError.js';

export const getPromotions = async () => {
  return repo.findAll();
};

export const createPromotion = async (data) => {
  if (!data.code || !data.value) {
    throw new AppError('Code and value are required', 400);
  }
  return repo.create(data);
};

export const updatePromotion = async (id, data) => {
  const promo = await repo.update(id, data);
  if (!promo) throw new AppError('Promotion not found', 404);
  return promo;
};

export const deletePromotion = async (id) => {
  const promo = await repo.findById(id);
  if (!promo) throw new AppError('Promotion not found', 404);
  return repo.remove(id);
};

export const togglePromotion = async (id) => {
  const promo = await repo.findById(id);
  if (!promo) throw new AppError('Promotion not found', 404);
  return repo.update(id, { isActive: !promo.isActive });
};

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