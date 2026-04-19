import * as adminRepo from './admin.repository.js';
import NotFoundError from '../../errors/NotFoundError.js';

export const getAllUsers = async () => {
  return adminRepo.findAllUsers();
};

export const changeUserStatus = async (userId, status) => {
  const user = await adminRepo.updateUserStatus(userId, status);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};