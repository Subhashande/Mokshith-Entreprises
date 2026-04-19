import User from '../user/user.model.js';
import Company from '../company/company.model.js';
import Order from '../order/order.model.js';

export const getAllUsers = () => User.find();

export const updateUserRole = (userId, role) =>
  User.findByIdAndUpdate(userId, { role }, { new: true });

export const getSystemStats = async () => {
  const users = await User.countDocuments();
  const companies = await Company.countDocuments();
  const orders = await Order.countDocuments();

  return {
    users,
    companies,
    orders,
  };
};