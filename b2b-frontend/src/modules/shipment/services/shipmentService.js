import apiClient from "../../../services/apiClient";

export const shipmentService = {
  async getShipmentDetails(id) {
    try {
      return await apiClient.get(`/shipments/${id}`);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch shipment details");
    }
  },

  async updateShipmentStatus(id, data) {
    try {
      return await apiClient.patch(`/shipments/${id}/status`, data);
    } catch (error) {
      throw new Error(error.message || "Failed to update shipment status");
    }
  },

  async getShipmentHistory(orderId) {
    try {
      return await apiClient.get(`/shipments/order/${orderId}`);
    } catch (error) {
      throw new Error(error.message || "Failed to fetch shipment history");
    }
  }
};