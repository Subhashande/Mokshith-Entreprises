import express from 'express';
import * as controller from './order.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, controller.createOrder);

router.get('/', protect, controller.getOrders);

router.get('/:id', protect, controller.getOrderById);

router.patch(
  '/:id/status',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.updateOrderStatus
);

export default router;