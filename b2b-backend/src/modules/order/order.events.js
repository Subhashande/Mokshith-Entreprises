import { sendNotification } from '../notification/notification.service.js';
import { TEMPLATES } from '../notification/notification.templates.js';

export const onOrderCreated = async (order) => {
  try {
    await sendNotification({
      userId: order.userId,
      ...TEMPLATES.ORDER_PLACED(order._id), // 🔥 standardized template
    });
  } catch (error) {
    // 🔥 Do not break main flow
    console.error('Notification failed:', error.message);
  }
};