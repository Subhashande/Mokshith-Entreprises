import Joi from 'joi';

export const updateStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid('PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED')
      .required(),
  }),
});