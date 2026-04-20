import Joi from 'joi';
import { ROLES } from '../../constants/roles.js';

export const updateUserRoleSchema = Joi.object({
  body: Joi.object({
    role: Joi.string()
      .valid(...Object.values(ROLES))
      .required(),
  }),
});