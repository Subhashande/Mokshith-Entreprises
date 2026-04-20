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

  async createAdmin(payload) {
    try {
      return await apiClient.post("/superadmin/admins", payload);
    } catch (error) {
      throw new Error(error);
    }
  },

  async deleteAdmin(id) {
    try {
      return await apiClient.delete(`/superadmin/admins/${id}`);
    } catch (error) {
      throw new Error(error);
    }
  },

  async getCategories() {
    try {
      return await apiClient.get("/superadmin/categories");
    } catch (error) {
      throw new Error(error);
    }
  },

  async createCategory(payload) {
    try {
      return await apiClient.post("/superadmin/categories", payload);
    } catch (error) {
      throw new Error(error);
    }
  },

  async deleteCategory(id) {
    try {
      return await apiClient.delete(`/superadmin/categories/${id}`);
    } catch (error) {
      throw new Error(error);
    }
  },

  async getDbCollection(name) {
    try {
      return await apiClient.get(`/superadmin/db/${name}`);
    } catch (error) {
      throw new Error(error);
    }
  },

  async getConfig() {
    try {
      return await apiClient.get("/superadmin/config");
    } catch (error) {
      throw new Error(error);
    }
  },

  async updateConfig(payload) {
    try {
      return await apiClient.post("/superadmin/config", payload);
    } catch (error) {
      throw new Error(error);
    }
  },
};