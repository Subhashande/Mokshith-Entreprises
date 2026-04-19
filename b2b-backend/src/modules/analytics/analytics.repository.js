import Order from '../order/order.model.js';

export const getOrderStats = async () => {
  return Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$totalAmount' },
      },
    },
  ]);
};