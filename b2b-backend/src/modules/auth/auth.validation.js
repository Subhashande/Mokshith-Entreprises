import Joi from 'joi';

export const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    mobile: Joi.string().optional(),
  }),
});

export const loginSchema = Joi.object({
  body: Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required(),
  }),
});

export const otpSchema = Joi.object({
  body: Joi.object({
    identifier: Joi.string().required(),
  }),
});

export const verifyOtpSchema = Joi.object({
  body: Joi.object({
    identifier: Joi.string().required(),
    otp: Joi.string().required(),
  }),
});