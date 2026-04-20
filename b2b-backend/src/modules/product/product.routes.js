import express from 'express';
import * as controller from './product.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createProductSchema, updateProductSchema } from './product.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  validate(createProductSchema),
  controller.createProduct
);

router.get('/', protect, controller.getProducts);

router.get('/:id', protect, controller.getProductById);

router.put(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateProductSchema),
  controller.updateProduct
);

router.delete(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.deleteProduct
);

router.patch(
  '/:id/stock',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.updateStock
);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.updateStatus
);

export default router;