import express from 'express';
import * as auditController from './audit.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

//  Only Admin / Super Admin
router.use(protect, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/', auditController.getLogs);
router.get('/:id', auditController.getLogById);

export default router;