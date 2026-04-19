import Notification from './notification.model.js';

export const createNotification = (data) =>
  Notification.create(data);

export const findByUser = (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1 });

export const markAsRead = (id) =>
  Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });