import Joi from 'joi';

export const addStockSchema = Joi.object({
  body: Joi.object({
    productId: Joi.string().required(),
    warehouseId: Joi.string().required(),
    stock: Joi.number().min(1).required(),
  }),
});