import express from 'express';
import * as controller from './support.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.post('/', protect, controller.createTicket);
router.get('/my-tickets', protect, controller.getMyTickets);

// Admin only
router.get('/all', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.getAllTickets);
router.patch('/:id/status', protect, authorize('ADMIN', 'SUPER_ADMIN'), controller.updateTicketStatus);

export default router;
