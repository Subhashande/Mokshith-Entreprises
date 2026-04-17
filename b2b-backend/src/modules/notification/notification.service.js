import * as repo from './notification.repository.js';

export const sendNotification = (data) =>
  repo.createNotification(data);

export const getNotifications = (userId) =>
  repo.findByUser(userId);

export const markAsRead = (id) =>
  repo.markAsRead(id);