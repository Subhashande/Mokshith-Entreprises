import Order from './order.model.js';

export const cancelPendingOrders = async () => {
  const orders = await Order.find({
    status: 'PENDING',
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
  });

  for (const order of orders) {
    order.status = 'CANCELLED';
    await order.save();
  }

  console.log('Expired orders cancelled:', orders.length);
};