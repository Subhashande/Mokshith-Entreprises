import { sendNotification } from '../notification/notification.service.js';

export const onOrderCreated = async (order) => {
  await sendNotification({
    userId: order.userId,
    title: 'Order Placed',
    message: `Order ${order._id} created successfully`,
  });
};