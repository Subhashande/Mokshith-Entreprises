import express from 'express';
import * as controller from './warehouse.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createWarehouseSchema } from './warehouse.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN'),
  validate(createWarehouseSchema),
  controller.createWarehouse
);

router.get('/', protect, controller.getWarehouses);

router.put(
  '/:id',
  protect,
  authorize('ADMIN'),
  controller.updateWarehouse
);

router.delete(
  '/:id',
  protect,
  authorize('ADMIN'),
  controller.deleteWarehouse
);

export default router;