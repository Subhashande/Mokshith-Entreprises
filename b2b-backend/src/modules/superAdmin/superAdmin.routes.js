import express from 'express';
import * as controller from './superAdmin.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { updateUserRoleSchema } from './superAdmin.validation.js';

const router = express.Router();

// 🔥 Only SUPER_ADMIN access
router.use(protect, authorize('SUPER_ADMIN'));

// 👤 Users
router.get('/users', controller.getUsers);

// 🔄 Change role
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  controller.updateUserRole
);

// 📊 System stats
router.get('/stats', controller.getStats);

export default router;