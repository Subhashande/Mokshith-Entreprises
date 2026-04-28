import { asyncHandler } from '../../utils/asyncHandler.js';
import * as adminService from './admin.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();
  successResponse(res, users);
});

export const getApprovals = asyncHandler(async (req, res) => {
  const users = await adminService.getPendingUsers();
  successResponse(res, users);
});

export const approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await adminService.changeUserStatus(id, 'ACTIVE');
  successResponse(res, user, 'User approved successfully');
});

export const rejectUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await adminService.changeUserStatus(id, 'SUSPENDED');
  successResponse(res, user, 'User rejected successfully');
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  successResponse(res, stats);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const user = await adminService.changeUserStatus(id, status);

  successResponse(res, user, 'User updated successfully');
});

export const updateUserCredit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { creditLimit } = req.body;

  const user = await adminService.updateUserCredit(id, creditLimit);

  successResponse(res, user, 'User credit updated successfully');
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await adminService.getAuditLogs(req.query);
  successResponse(res, logs);
});