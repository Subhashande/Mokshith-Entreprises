import Joi from 'joi';

export const addToCartSchema = Joi.object({
  body: Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
  }),
});