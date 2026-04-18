import apiClient from "../../../services/apiClient";

export const superAdminService = {
  async getAuditLogs() {
    try {
      return await apiClient.get("/superadmin/audit-logs");
    } catch {
      throw new Error("Failed to fetch audit logs");
    }
  },

  async getMetrics() {
    try {
      return await apiClient.get("/superadmin/metrics");
    } catch {
      throw new Error("Failed to fetch metrics");
    }
  },

  async getAdmins() {
    try {
      return await apiClient.get("/superadmin/admins");
    } catch {
      throw new Error("Failed to fetch admins");
    }
  },

  async getCategories() {
    try {
      return await apiClient.get("/superadmin/categories");
    } catch {
      throw new Error("Failed to fetch categories");
    }
  },

  async getDbCollection(name) {
    try {
      return await apiClient.get(`/superadmin/db/${name}`);
    } catch {
      throw new Error(`Failed to fetch ${name} collection`);
    }
  },

  async getConfig() {
    try {
      return await apiClient.get("/superadmin/config");
    } catch {
      throw new Error("Failed to fetch config");
    }
  },

  async updateConfig(payload) {
    try {
      return await apiClient.post("/superadmin/config", payload);
    } catch {
      throw new Error("Failed to update config");
    }
  },
};