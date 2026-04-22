import apiClient from "../../../services/apiClient";

export const creditService = {
  async getCreditInfo() {
    try {
      return await apiClient.get("/credit");
    } catch {
      throw new Error("Failed to fetch credit info");
    }
  },

  async getLedger() {
    try {
      return await apiClient.get("/credit/ledger");
    } catch {
      throw new Error("Failed to fetch ledger");
    }
  },
async useCredit(orderId) {
    try {
      return await apiClient.post("/credit/use", { orderId });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to use credit");
    }
  },
};