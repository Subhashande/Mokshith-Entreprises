import express from 'express';
import * as controller from './wishlist.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { addToWishlistSchema } from './wishlist.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  validate(addToWishlistSchema),
  controller.addToWishlist
);

router.get('/', protect, controller.getWishlist);

router.delete('/:productId', protect, controller.removeFromWishlist);

export default router;