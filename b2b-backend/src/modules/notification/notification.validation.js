import Joi from 'joi';

export const markAsReadSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().required(),
  }),
});