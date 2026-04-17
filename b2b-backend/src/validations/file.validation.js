import Joi from 'joi';

export const fileSchema = Joi.object({
  filename: Joi.string().required(),
});