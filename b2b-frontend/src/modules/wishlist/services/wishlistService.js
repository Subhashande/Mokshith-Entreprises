import apiClient from "../../../services/apiClient";

export const wishlistService = {
  async getWishlist() {
    try {
      return await apiClient.get("/wishlist");
    } catch (error) {
      throw new Error(error.message || "Failed to fetch wishlist");
    }
  },

  async addToWishlist(productId) {
    try {
      return await apiClient.post("/wishlist/add", { productId });
    } catch (error) {
      throw new Error(error.message || "Failed to add to wishlist");
    }
  },

  async removeFromWishlist(productId) {
    try {
      return await apiClient.delete(`/wishlist/remove/${productId}`);
    } catch (error) {
      throw new Error(error.message || "Failed to remove from wishlist");
    }
  },

  async clearWishlist() {
    try {
      return await apiClient.delete("/wishlist/clear");
    } catch (error) {
      throw new Error(error.message || "Failed to clear wishlist");
    }
  }
};
