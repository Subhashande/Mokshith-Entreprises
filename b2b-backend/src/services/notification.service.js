import Notification from '../modules/notification/notification.model.js';

export const sendNotification = async (data) => {
  return Notification.create(data);
};