import express from 'express';
import * as controller from './inventory.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), controller.addStock);
router.get('/', protect, controller.getInventory);

export default router;