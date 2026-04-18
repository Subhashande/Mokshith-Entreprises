import express from 'express';
import * as controller from './user.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

// USER
router.get('/me', protect, controller.getProfile);
router.put('/me', protect, controller.updateProfile);

// ADMIN
router.get('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.getAllUsers);
router.get('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.getUserById);
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.deleteUser);

export default router;