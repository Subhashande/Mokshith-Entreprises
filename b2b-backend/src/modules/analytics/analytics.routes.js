import express from 'express';
import * as controller from './analytics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.get('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.getDashboard);

export default router;