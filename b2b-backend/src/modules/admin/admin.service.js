import * as adminRepo from './admin.repository.js';
import NotFoundError from '../../errors/NotFoundError.js';
import { USER_STATUS } from '../../constants/userStatus.js';
import User from '../user/user.model.js';
import Order from '../order/order.model.js';

export const getAllUsers = async () => {
  return User.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

export const getPendingUsers = async () => {
  const users = await User.find({ 
    status: USER_STATUS.PENDING, 
    isDeleted: { $ne: true } 
  }).sort({ createdAt: -1 });

  return users.map(user => ({
    id: user._id,
    type: 'REGISTRATION',
    status: 'pending',
    title: `${user.name} (${user.role})`,
    email: user.email,
    createdAt: user.createdAt
  }));
};

export const changeUserStatus = async (userId, status) => {
  const user = await adminRepo.updateUserStatus(userId, status);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

export const getStats = async () => {
  const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
  const totalOrders = await Order.countDocuments();
  const pendingApprovals = await User.countDocuments({ 
    status: USER_STATUS.PENDING, 
    isDeleted: { $ne: true } 
  });
  
  const revenue = await Order.aggregate([
    { $match: { paymentStatus: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  return {
    totalUsers,
    totalOrders,
    pendingApprovals,
    revenue: revenue[0]?.total || 0,
  };
};

export const updateUserCredit = async (userId, creditLimit) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Calculate the difference to adjust available credit
  const diff = creditLimit - user.creditLimit;
  user.creditLimit = creditLimit;
  user.availableCredit = (user.availableCredit || 0) + diff;

  await user.save();

  return user;
};