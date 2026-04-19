import { asyncHandler } from '../../utils/asyncHandler.js';
import * as adminService from './admin.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();
  successResponse(res, users);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await adminService.changeUserStatus(id, status);

  successResponse(res, user, 'User updated successfully');
});