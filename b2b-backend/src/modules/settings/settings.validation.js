import Joi from 'joi';

export const updateSettingSchema = Joi.object({
  body: Joi.object({
    key: Joi.string().required(),
    value: Joi.any().required(),
  }),
});