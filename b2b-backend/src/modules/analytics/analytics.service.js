import * as analyticsRepo from './analytics.repository.js';

export const getDashboardStats = async () => {
  const [orderStats, salesByMonth, topCategories, topProducts, activeCustomers, pendingDeliveries] = await Promise.all([
    analyticsRepo.getOrderStats(),
    analyticsRepo.getSalesByMonth(),
    analyticsRepo.getTopCategories(),
    analyticsRepo.getTopProductsDetailed(),
    analyticsRepo.getActiveCustomersCount(),
    analyticsRepo.getPendingDeliveriesCount()
  ]);

  const totalOrders = orderStats.reduce((sum, s) => sum + s.count, 0);
  const revenue = orderStats.reduce((sum, s) => sum + s.total, 0);

  // Growth calculations (comparing last month vs previous month)
  let ordersGrowth = 0;
  let revenueGrowth = 0;

  if (salesByMonth.length >= 2) {
    const currentMonth = salesByMonth[salesByMonth.length - 1];
    const lastMonth = salesByMonth[salesByMonth.length - 2];

    if (lastMonth.orders > 0) {
      ordersGrowth = Math.round(((currentMonth.orders - lastMonth.orders) / lastMonth.orders) * 100);
    }
    if (lastMonth.revenue > 0) {
      revenueGrowth = Math.round(((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100);
    }
  }

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
      ordersGrowth,
      revenueGrowth,
      activeCustomers,
      pendingDeliveries
    },
    salesData,
    orderTrends: salesData,
    categoryData,
    topProducts
  };
};