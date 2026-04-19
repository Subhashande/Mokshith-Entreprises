import Joi from 'joi';

export const addToWishlistSchema = Joi.object({
  body: Joi.object({
    productId: Joi.string().required(),
  }),
});