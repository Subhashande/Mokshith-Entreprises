import apiClient from "../../services/apiClient";

export const notificationService = {
  async getNotifications() {
    try {
      return await apiClient.get("/notifications");
    } catch {
      throw new Error("Failed to fetch notifications");
    }
  },

  async markAsRead(id) {
    try {
      return await apiClient.put(`/notifications/${id}/read`);
    } catch {
      throw new Error("Failed to update notification");
    }
  },
};