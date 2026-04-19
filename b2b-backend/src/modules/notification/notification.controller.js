import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './notification.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await service.getNotifications(req.user.id);
  successResponse(res, data);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const data = await service.markAsRead(req.params.id);
  successResponse(res, data, 'Notification marked as read');
});