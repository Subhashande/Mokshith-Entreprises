import apiClient from "../../services/apiClient";

export const paymentService = {
  async getPayments() {
    try {
      return await apiClient.get("/payments");
    } catch {
      throw new Error("Failed to fetch payments");
    }
  },

  async verifyPayment(payload) {
    try {
      return await apiClient.post("/payments/verify", payload);
    } catch {
      throw new Error("Payment verification failed");
    }
  },
};