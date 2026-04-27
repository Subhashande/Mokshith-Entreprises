import express from 'express';
import * as controller from './wishlist.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { addToWishlistSchema } from './wishlist.validation.js';

const router = express.Router();

router.get('/', protect, controller.getWishlist);
router.post('/add', protect, validate(addToWishlistSchema), controller.addToWishlist);
router.delete('/remove/:productId', protect, controller.removeFromWishlist);
router.delete('/clear', protect, controller.clearWishlist);

export default router;