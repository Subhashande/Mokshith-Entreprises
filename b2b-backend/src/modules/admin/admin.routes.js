import express from 'express';
import * as adminController from './admin.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateUserStatusSchema } from './admin.validation.js';

const router = express.Router();

router.use(protect, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/users', adminController.getUsers);

router.patch(
  '/users/:id',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);

export default router;