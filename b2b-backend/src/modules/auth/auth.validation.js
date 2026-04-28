import Joi from 'joi';
import { ROLES } from '../../constants/roles.js';

export const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      }),
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