import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './user.service.js';
import { successResponse } from '../../utils/responseHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await service.getProfile(req.user.id);
  successResponse(res, user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await service.updateProfile(req.user.id, req.body);
  successResponse(res, user, 'Profile updated');
});

// ADMIN
export const getAllUsers = asyncHandler(async (req, res) => {
  const data = await service.getAllUsers(req.query);
  successResponse(res, data);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  successResponse(res, user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await service.deleteUser(req.params.id);
  successResponse(res, user, 'User deleted');
});

export const changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.id, req.body.newPassword);
  successResponse(res, null, 'Password changed successfully');
});

export const updateProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }
  
  // In a real app, you'd upload to Cloudinary/S3 here
  // For now, we'll use the local path
  const imageUrl = `/uploads/temp/${req.file.filename}`;
  const user = await service.updateProfile(req.user.id, { profileImage: imageUrl });
  
  successResponse(res, user, 'Profile image updated');
});