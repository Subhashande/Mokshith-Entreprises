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
router.get('/admins', controller.getAdmins);
router.post('/admins', controller.createAdmin);
router.delete('/admins/:id', controller.deleteAdmin);

// 🔄 Change role
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  controller.updateUserRole
);

// 📊 System stats
router.get('/stats', controller.getStats);
router.get('/metrics', controller.getMetrics);
router.get('/audit-logs', controller.getAuditLogs);

// ⚙️ Config
router.get('/config', controller.getConfig);
router.post('/config', controller.updateConfig);

// 🛍️ Catalog
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);
router.delete('/categories/:id', controller.deleteCategory);

export default router;