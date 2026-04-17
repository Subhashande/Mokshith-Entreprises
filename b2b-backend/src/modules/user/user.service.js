import AppError from '../../errors/AppError.js';
import * as repo from './user.repository.js';

export const getProfile = async (userId) => {
  const user = await repo.findById(userId);

  if (!user) throw new AppError('User not found', 404);

  return user;
};

export const updateProfile = async (userId, data) => {
  const user = await repo.updateUserById(userId, data);

  if (!user) throw new AppError('User not found', 404);

  return user;
};

// ADMIN
export const getAllUsers = async (query) => {
  const { page = 1, limit = 10, search } = query;

  const skip = (page - 1) * limit;

  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await repo.findAll(filter, {
    skip,
    limit: Number(limit),
    sort: { createdAt: -1 },
  });

  const total = await repo.countUsers(filter);

  return {
    users,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  };
};

export const getUserById = async (id) => {
  const user = await repo.findById(id);

  if (!user) throw new AppError('User not found', 404);

  return user;
};

export const deleteUser = async (id) => {
  const user = await repo.updateUserById(id, {
    isDeleted: true,
  });

  if (!user) throw new AppError('User not found', 404);

  return user;
};