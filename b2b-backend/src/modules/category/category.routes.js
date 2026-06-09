import express from 'express';
import * as controller from './category.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createCategorySchema } from './category.validation.js';
import { cacheMiddleware, clearCacheMiddleware } from '../../middlewares/cache.middleware.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createCategorySchema),
  controller.createCategory,
  clearCacheMiddleware(['cache:*categories*', 'cache:*products*'])
);

router.get('/', cacheMiddleware(300), controller.getCategories); // Cache for 5 minutes

// 🔥 NEW
router.get('/:id', cacheMiddleware(600), controller.getCategoryById); // Cache for 10 minutes

export default router;