import apiClient from "../../services/apiClient";

export const offerService = {
  async getOffers() {
    try {
      return await apiClient.get("/offers");
    } catch {
      throw new Error("Failed to fetch offers");
    }
  },
};