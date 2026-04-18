import apiClient from "../../services/apiClient";

export const settingsService = {
  async getSettings() {
    try {
      return await apiClient.get("/settings");
    } catch {
      throw new Error("Failed to fetch settings");
    }
  },

  async updateSettings(payload) {
    try {
      return await apiClient.put("/settings", payload);
    } catch {
      throw new Error("Failed to update settings");
    }
  },
};