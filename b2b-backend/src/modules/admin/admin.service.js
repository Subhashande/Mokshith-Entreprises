import * as adminRepo from './admin.repository.js';
import NotFoundError from '../../errors/NotFoundError.js';
import { USER_STATUS } from '../../constants/userStatus.js';
import User from '../user/user.model.js';
import Order from '../order/order.model.js';
import Audit from '../audit/audit.model.js';

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
  // Validate credit limit
  if (creditLimit < 0) {
    throw new AppError('Credit limit cannot be negative', 400);
  }
  
  if (creditLimit > 10000000) {
    throw new AppError('Credit limit cannot exceed ₹1,00,00,000', 400);
  }

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

export const getAuditLogs = async (query = {}) => {
  const { page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const logs = await Audit.find()
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .populate('userId', 'name email');

  const total = await Audit.countDocuments();

  return {
    data: logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};