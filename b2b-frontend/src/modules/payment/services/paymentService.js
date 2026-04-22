import apiClient from "../../../services/apiClient";

export const paymentService = {
  async getPayments() {
    try {
      return await apiClient.get("/payments");
    } catch {
      throw new Error("Failed to fetch payments");
    }
  },

  async createRazorpayOrder(amount) {
    try {
      return await apiClient.post("/payments/create-order", { amount });
    } catch {
      throw new Error("Failed to create Razorpay order");
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