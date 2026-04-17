import Joi from 'joi';

export const paginationQuery = Joi.object({
  page: Joi.number().optional(),
  limit: Joi.number().optional(),
});