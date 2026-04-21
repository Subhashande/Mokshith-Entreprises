import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
  cart: [],
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchOrdersSuccess: (state, action) => {
      state.loading = false;
      state.orders = action.payload;
    },
    addToCart: (state, action) => {
      const item = action.payload;
      const itemId = item._id || item.id;
      const existingItem = state.cart.find((i) => (i._id || i.id) === itemId);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: 1 });
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter((item) => (item._id || item.id) !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.cart.find((i) => (i._id || i.id) === id);
      if (item) {
        item.quantity = quantity;
      }
    },
    clearCart: (state) => {
      state.cart = [];
    },
    fetchFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchStart, fetchOrdersSuccess, addToCart, removeFromCart, updateQuantity, clearCart, fetchFailure } = orderSlice.actions;
export default orderSlice.reducer;
