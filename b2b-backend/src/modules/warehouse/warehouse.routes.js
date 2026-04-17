import express from 'express';
import * as controller from './warehouse.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), controller.createWarehouse);
router.get('/', protect, controller.getWarehouses);

export default router;