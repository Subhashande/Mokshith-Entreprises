import * as repo from './analytics.repository.js';

export const getDashboardStats = async () => {
  const data = await repo.getSalesStats();
  return data[0] || { totalRevenue: 0, totalOrders: 0 };
};