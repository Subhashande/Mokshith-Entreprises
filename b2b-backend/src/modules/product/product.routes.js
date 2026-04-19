import express from 'express';
import * as controller from './product.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createProductSchema } from './product.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  validate(createProductSchema),
  controller.createProduct
);

router.get('/', protect, controller.getProducts);

router.get('/:id', protect, controller.getProductById);

export default router;