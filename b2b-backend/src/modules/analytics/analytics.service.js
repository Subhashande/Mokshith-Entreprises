import * as analyticsRepo from './analytics.repository.js';

export const getDashboardStats = async () => {
  const [orderStats, salesByMonth, topCategories, topProducts] = await Promise.all([
    analyticsRepo.getOrderStats(),
    analyticsRepo.getSalesByMonth(),
    analyticsRepo.getTopCategories(),
    analyticsRepo.getTopProducts()
  ]);

  const totalOrders = orderStats.reduce((sum, s) => sum + s.count, 0);
  const revenue = orderStats.reduce((sum, s) => sum + s.total, 0);

  // Formatting for frontend
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const salesData = salesByMonth.map(s => ({
    name: months[s._id.month - 1],
    revenue: s.revenue,
    orders: s.orders
  }));

  const categoryData = topCategories.map(c => ({
    name: c._id || 'Uncategorized',
    value: c.value
  }));

  return {
    dashboard: {
      totalOrders,
      revenue,
      ordersGrowth: 12, // Mock growth for now
      revenueGrowth: 8,
      activeCustomers: 45,
      pendingDeliveries: 18
    },
    salesData,
    orderTrends: salesData, // Reusing sales data for trends
    categoryData,
    topProducts
  };
};