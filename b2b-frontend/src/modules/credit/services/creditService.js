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
};