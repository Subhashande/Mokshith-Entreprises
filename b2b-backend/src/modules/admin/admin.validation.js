import Joi from 'joi';

export const updateUserStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().required(),
  }),
  params: Joi.object({
    id: Joi.string().required(),
  }),
});