import express from 'express';
import * as controller from './company.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.createCompany);
router.get('/', protect, controller.getAllCompanies);
router.get('/:id', protect, controller.getCompany);
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.updateCompany);

export default router;