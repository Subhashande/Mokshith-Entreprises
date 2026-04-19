import express from 'express';
import * as analyticsController from './analytics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(protect, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', analyticsController.getDashboard);

export default router;