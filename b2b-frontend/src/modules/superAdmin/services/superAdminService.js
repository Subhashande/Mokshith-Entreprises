import apiClient from "../../services/apiClient";

export const superAdminService = {
  async getAuditLogs() {
    try {
      return await apiClient.get("/super-admin/audit");
    } catch {
      throw new Error("Failed to fetch audit logs");
    }
  },

  async getConfig() {
    try {
      return await apiClient.get("/super-admin/config");
    } catch {
      throw new Error("Failed to fetch config");
    }
  },

  async updateConfig(payload) {
    try {
      return await apiClient.put("/super-admin/config", payload);
    } catch {
      throw new Error("Failed to update config");
    }
  },
};