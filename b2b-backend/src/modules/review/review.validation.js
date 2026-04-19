import Joi from 'joi';

export const addReviewSchema = Joi.object({
  body: Joi.object({
    productId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().optional(),
  }),
});