import Joi from 'joi';

export const createOrderSchema = Joi.object({
  body: Joi.object({}),
});