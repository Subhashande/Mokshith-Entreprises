import apiClient from "../../services/apiClient";

export const wishlistService = {
  async getWishlist() {
    try {
      return await apiClient.get("/wishlist");
    } catch {
      throw new Error("Failed to fetch wishlist");
    }
  },

  async addToWishlist(productId) {
    try {
      return await apiClient.post("/wishlist", { productId });
    } catch {
      throw new Error("Failed to add item");
    }
  },

  async removeFromWishlist(id) {
    try {
      return await apiClient.delete(`/wishlist/${id}`);
    } catch {
      throw new Error("Failed to remove item");
    }
  },
};