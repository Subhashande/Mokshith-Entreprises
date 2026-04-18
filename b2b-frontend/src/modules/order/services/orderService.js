import apiClient from "../../../services/apiClient";

export const orderService = {
  async getOrders() {
    try {
      return await apiClient.get("/orders");
    } catch {
      throw new Error("Failed to fetch orders");
    }
  },

  async placeOrder(payload) {
    try {
      return await apiClient.post("/orders", payload);
    } catch {
      throw new Error("Order placement failed");
    }
  },
};