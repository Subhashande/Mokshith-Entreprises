import Order from './order.model.js';
import { sendNotification } from '../notification/notification.service.js';

export const cancelPendingOrders = async () => {
  try {
    const expiryTime = new Date(Date.now() - 30 * 60 * 1000);

    const orders = await Order.find({
      status: 'PENDING',
      createdAt: { $lt: expiryTime },
    });

    for (const order of orders) {
      order.status = 'CANCELLED';
      await order.save();

      //  Optional: notify user
      await sendNotification({
        userId: order.userId,
        title: 'Order Cancelled',
        message: `Your order ${order._id} was cancelled due to timeout.`,
      });
    }

    console.log(` Expired orders cancelled: ${orders.length}`);
  } catch (error) {
    console.error(' Order cleanup job failed:', error.message);
  }
};