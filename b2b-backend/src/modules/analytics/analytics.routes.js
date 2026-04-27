import express from 'express';
import * as analyticsController from './analytics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(protect, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', analyticsController.getDashboard);
router.get('/sales', analyticsController.getDashboard);
router.get('/orders-trends', analyticsController.getDashboard);
router.get('/categories', analyticsController.getDashboard);
router.get('/top-products', analyticsController.getDashboard);
router.get('/revenue', analyticsController.getDashboard);

export default router;