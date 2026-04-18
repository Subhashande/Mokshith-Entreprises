import apiClient from "../../services/apiClient";

export const adminService = {
  async getApprovals() {
    try {
      return await apiClient.get("/admin/approvals");
    } catch {
      throw new Error("Failed to fetch approvals");
    }
  },

  async approve(id) {
    try {
      return await apiClient.post(`/admin/approve/${id}`);
    } catch {
      throw new Error("Approval failed");
    }
  },

  async getStats() {
    try {
      return await apiClient.get("/admin/stats");
    } catch {
      throw new Error("Failed to fetch stats");
    }
  },
};  