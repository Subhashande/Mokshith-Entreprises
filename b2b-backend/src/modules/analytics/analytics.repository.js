import Order from '../order/order.model.js';

export const getSalesStats = async () => {
  return Order.aggregate([
    {
      $match: { status: 'DELIVERED' },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
      },
    },
  ]);
};