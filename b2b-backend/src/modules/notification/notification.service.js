import * as repo from './notification.repository.js';
import { notificationQueue } from '../../queues/notification.queue.js';

export const sendNotification = async (data) => {
  // 🔥 Queue-based (async processing)
  await notificationQueue.add(data);

  return repo.createNotification(data);
};

export const getNotifications = async (userId) => {
  return repo.findByUser(userId);
};

export const markAsRead = async (id) => {
  return repo.markAsRead(id);
};