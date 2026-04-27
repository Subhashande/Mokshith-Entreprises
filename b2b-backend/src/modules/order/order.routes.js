import express from 'express';
import * as controller from './order.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import {
  createOrderSchema,
  updateOrderStatusSchema,
} from './order.validation.js';

const router = express.Router();

router.post('/', protect, validate(createOrderSchema), controller.createOrder);

router.get('/', protect, controller.getOrders);

router.get('/:id', protect, controller.getOrderById);

router.get('/:id/invoice', protect, controller.downloadInvoice);

router.post('/:id/fail', protect, controller.markOrderAsFailed);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateOrderStatusSchema),
  controller.updateOrderStatus
);

export default router;