import express from 'express';
import * as controller from './category.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createCategorySchema } from './category.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createCategorySchema),
  controller.createCategory
);

router.get('/', protect, controller.getCategories);

export default router;