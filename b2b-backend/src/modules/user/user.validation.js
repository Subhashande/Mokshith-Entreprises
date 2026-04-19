import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().optional(),
    email: Joi.string().email().optional(),
    mobile: Joi.string().optional(),
  }),
});