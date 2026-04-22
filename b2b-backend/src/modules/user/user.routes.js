import express from 'express';
import * as controller from './user.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateProfileSchema } from './user.validation.js';

const router = express.Router();

// USER
router.get('/me', protect, controller.getProfile);

router.put(
  '/me',
  protect,
  validate(updateProfileSchema),
  controller.updateProfile
);

router.put('/change-password', protect, controller.changePassword);

// ADMIN
router.get(
  '/',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.getAllUsers
);

router.get(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.getUserById
);

router.delete(
  '/:id',
  protect,
  authorize('ADMIN', 'SUPER_ADMIN'),
  controller.deleteUser
);

export default router;