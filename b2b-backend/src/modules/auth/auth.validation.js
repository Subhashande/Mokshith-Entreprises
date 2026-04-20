import Joi from 'joi';
import { ROLES } from '../../constants/roles.js';

export const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    mobile: Joi.string().required(),
    role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.B2B_CUSTOMER),
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