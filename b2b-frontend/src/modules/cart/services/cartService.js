import apiClient from '../../../services/apiClient';

export const cartService = {
  async getCart() {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  async addToCart(productId, quantity = 1) {
    const response = await apiClient.post('/cart', { productId, quantity });
    return response.data;
  },

  async updateQuantity(productId, quantity) {
    const response = await apiClient.patch(`/cart/${productId}`, { quantity });
    return response.data;
  },

  async removeFromCart(productId) {
    await apiClient.delete(`/cart/${productId}`);
  },

  async clearCart() {
    await apiClient.delete('/cart');
  }
};
