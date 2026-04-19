import express from 'express';
import * as controller from './inventory.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { addStockSchema } from './inventory.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN'),
  validate(addStockSchema),
  controller.addStock
);

router.get('/', protect, controller.getInventory);

export default router;