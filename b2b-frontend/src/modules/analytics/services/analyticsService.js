import apiClient from "../../../services/apiClient";

export const analyticsService = {
  async getAnalytics(params = {}) {
    try {
      return await apiClient.get("/analytics", params);
    } catch {
      throw new Error("Failed to fetch analytics");
    }
  },
};