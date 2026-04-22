import apiClient from "../../../services/apiClient";

export const supportService = {
  async createTicket(ticketData) {
    try {
      const response = await apiClient.post("/support", ticketData);
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to create support ticket");
    }
  },

  async getMyTickets() {
    try {
      const response = await apiClient.get("/support/my-tickets");
      return response.data || response;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch tickets");
    }
  },
};
