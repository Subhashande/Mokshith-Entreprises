import Joi from 'joi';

export const createCreditSchema = Joi.object({
  body: Joi.object({
    userId: Joi.string().required(),
    limit: Joi.number().min(0).required(),
  }),
});

export const creditActionSchema = Joi.object({
  body: Joi.object({
    amount: Joi.number().min(1).required(),
  }),
});