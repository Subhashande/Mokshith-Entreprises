import express from 'express';
import * as controller from './company.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createCompanySchema,
  updateCompanySchema,
} from './company.validation.js';

const router = express.Router();

router.post(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(createCompanySchema),
  controller.createCompany
);

router.get('/', protect, controller.getAllCompanies);

router.get('/me', protect, controller.getMyCompany);

router.put('/update', protect, authorize('ADMIN', 'VENDOR'), controller.updateMyCompany);

router.get('/:id', protect, controller.getCompany);

router.put(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(updateCompanySchema),
  controller.updateCompany
);

export default router;