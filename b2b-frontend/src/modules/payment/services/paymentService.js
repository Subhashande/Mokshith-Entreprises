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

  // 🔥 FIXED CORRECTLY (IMPORTANT)
  async hybridPayment(orderId, useCredit) {
    try {
      // 🔥 ADD DEBUG
      console.log("Calling Hybrid API:", { orderId, useCredit });

      const response = await apiClient.post(
        "/payments/hybrid", // ✅ CORRECT ENDPOINT
        { orderId, useCredit } // ✅ send both
      );

      return response;
    } catch (err) {
      console.error("Hybrid Payment Error:", err);

      const message =
        typeof err === "string"
          ? err
          : err.response?.data?.message ||
            err.message ||
            "Hybrid payment failed";

      throw new Error(message);
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