import Joi from 'joi';

export const applyCouponSchema = Joi.object({
  body: Joi.object({
    code: Joi.string().trim().required(),
    amount: Joi.number().min(1).required(),
  }),
});