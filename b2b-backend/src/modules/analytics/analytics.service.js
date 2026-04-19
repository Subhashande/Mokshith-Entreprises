import * as analyticsRepo from './analytics.repository.js';

export const getDashboardStats = async () => {
  const orderStats = await analyticsRepo.getOrderStats();

  return {
    orders: orderStats,
  };
};