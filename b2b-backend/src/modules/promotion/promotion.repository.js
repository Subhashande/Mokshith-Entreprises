import Promotion from './promotion.model.js';

export const createPromotion = (data) => Promotion.create(data);

export const findByCode = (code) =>
  Promotion.findOne({
    code: code.toUpperCase(),
    isActive: true,
  });