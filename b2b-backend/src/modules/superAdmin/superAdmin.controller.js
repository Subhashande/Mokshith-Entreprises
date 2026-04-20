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

export const getAdmins = asyncHandler(async (req, res) => {
  const admins = await service.getAdmins();
  successResponse(res, admins);
});

export const createAdmin = asyncHandler(async (req, res) => {
  const admin = await service.createAdmin(req.body);
  successResponse(res, admin, 'Admin created successfully', 201);
});

export const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await service.deleteAdmin(req.params.id);
  successResponse(res, result);
});

export const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await service.getMetrics();
  successResponse(res, metrics);
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await service.getAuditLogs();
  successResponse(res, logs);
});

export const getConfig = asyncHandler(async (req, res) => {
  const config = await service.getConfig();
  successResponse(res, config);
});

export const updateConfig = asyncHandler(async (req, res) => {
  const config = await service.updateConfig(req.body);
  successResponse(res, config, 'Config updated');
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await service.getCategories();
  successResponse(res, categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await service.createCategory(req.body);
  successResponse(res, category, 'Category created successfully', 201);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await service.deleteCategory(req.params.id);
  successResponse(res, result);
});