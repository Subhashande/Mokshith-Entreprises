import apiClient from "../../../services/apiClient";

export const reviewService = {
  async getReviews(productId) {
    try {
      return await apiClient.get(`/reviews/${productId}`);
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch reviews");
    }
  },

  async addReview(payload) {
    try {
      return await apiClient.post("/reviews", payload);
    } catch {
      throw new Error("Failed to submit review");
    }
  },
};