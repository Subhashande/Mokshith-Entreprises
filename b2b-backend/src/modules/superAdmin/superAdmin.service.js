import * as repo from './superAdmin.repository.js';
import AppError from '../../errors/AppError.js';

export const getAllUsers = async () => {
  return repo.getAllUsers();
};

export const changeUserRole = async (userId, role) => {
  if (!userId || !role) {
    throw new AppError('UserId and role required', 400);
  }

  const user = await repo.updateUserRole(userId, role);

  if (!user) throw new AppError('User not found', 404);

  return user;
};

export const getSystemStats = async () => {
  return repo.getSystemStats();
};