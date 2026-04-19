import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './superAdmin.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await service.getAllUsers();
  successResponse(res, users);
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await service.changeUserRole(
    req.params.id,
    req.body.role
  );

  successResponse(res, user, 'User role updated');
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await service.getSystemStats();
  successResponse(res, stats);
});