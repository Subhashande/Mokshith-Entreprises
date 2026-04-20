import * as repo from './superAdmin.repository.js';
import AppError from '../../errors/AppError.js';
import User from '../user/user.model.js';
import { ROLES } from '../../constants/roles.js';
import { USER_STATUS } from '../../constants/userStatus.js';
import { hashPassword } from '../../utils/hashPassword.js';
import { fetchSetting, updateSetting, getAllSettings } from '../settings/settings.service.js';
import Category from '../category/category.model.js';
import Audit from '../audit/audit.model.js';
import Order from '../order/order.model.js';
import { createCreditAccount } from '../credit/credit.service.js';

export const getAllUsers = async () => {
  return repo.getAllUsers();
};

export const getAdmins = async () => {
  return User.find({ role: ROLES.ADMIN });
};

export const createAdmin = async (data) => {
  const { name, email, password, mobile } = data;

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError('User with this email already exists', 400);
  }

  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    throw new AppError('User with this mobile number already exists', 400);
  }

  const hashedPassword = await hashPassword(password);
  
  const admin = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    isVerified: true
  });

  // Create credit account for admin as well (optional, but consistent)
  try {
    await createCreditAccount(admin._id, 50000);
  } catch (err) {
    console.error('Failed to create credit account for admin:', err.message);
  }

  return admin;
};

export const deleteAdmin = async (id) => {
  const user = await User.findById(id);
  if (!user || user.role !== ROLES.ADMIN) {
    throw new AppError('Admin not found', 404);
  }
  
  // 🔥 Use soft delete for consistency
  await User.findByIdAndUpdate(id, { isDeleted: true });
  
  return { message: 'Admin deleted successfully' };
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

export const getMetrics = async () => {
  const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
  const activeVendors = await User.countDocuments({ 
    role: ROLES.VENDOR, 
    status: USER_STATUS.ACTIVE,
    isDeleted: { $ne: true }
  });
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const ordersToday = await Order.countDocuments({
    createdAt: { $gte: startOfToday }
  });
  
  const revenueResult = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfToday }, paymentStatus: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const revenueToday = revenueResult[0]?.total || 0;
  
  const pendingApprovals = await User.countDocuments({
    status: USER_STATUS.PENDING,
    isDeleted: { $ne: true }
  });

  return {
    totalUsers,
    activeVendors,
    ordersToday,
    revenueToday,
    pendingApprovals
  };
};

export const getAuditLogs = async () => {
  return Audit.find().sort({ createdAt: -1 }).limit(100);
};

export const getConfig = async () => {
  const settings = await getAllSettings();
  // Transform array to object for frontend convenience
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
};

export const updateConfig = async (config) => {
  for (const [key, value] of Object.entries(config)) {
    await updateSetting(key, value);
  }
  return getConfig();
};

export const getCategories = async () => {
  return Category.find();
};

export const createCategory = async (data) => {
  return Category.create(data);
};

export const deleteCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  await Category.findByIdAndDelete(id);
  return { message: 'Category deleted successfully' };
};