import Promotion from './promotion.model.js';

export const create = (data) => Promotion.create(data);

export const findAll = () =>
  Promotion.find().sort({ createdAt: -1 });

export const findById = (id) => Promotion.findById(id);

export const update = (id, data) =>
  Promotion.findByIdAndUpdate(id, data, { new: true });

export const remove = (id) =>
  Promotion.findByIdAndDelete(id);

export const findByCode = (code) =>
  Promotion.findOne({
    code: code.toUpperCase(),
    isActive: true,
  });