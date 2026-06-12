import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  allProducts: [], // For category counts
  categories: [],
  pagination: null,
  selectedProduct: null,
  loading: false,
  allProductsLoading: false,
  categoriesLoading: false,
  error: null,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAllProductsStart: (state) => {
      state.allProductsLoading = true;
    },
    fetchProductsSuccess: (state, action) => {
      state.loading = false;
      
      // Handle null/undefined payload
      if (!action.payload) {
        state.products = [];
        state.pagination = null;
        return;
      }
      
      const payloadData = action.payload.data || action.payload;
      
      if (Array.isArray(payloadData)) {
        state.products = payloadData;
        state.pagination = null;
      } else if (payloadData && typeof payloadData === 'object') {
        state.products = payloadData.products || [];
        state.pagination = payloadData.pagination || null;
      } else {
        state.products = [];
        state.pagination = null;
      }
    },
    fetchAllProductsSuccess: (state, action) => {
      state.allProductsLoading = false;
      const payloadData = action.payload.data || action.payload;
      state.allProducts = payloadData.products || (Array.isArray(payloadData) ? payloadData : []);
    },
    fetchCategoriesStart: (state) => {
      state.categoriesLoading = true;
    },
    fetchCategoriesSuccess: (state, action) => {
      state.categoriesLoading = false;
      const payloadData = action.payload.data || action.payload;
      state.categories = Array.isArray(payloadData) ? payloadData : [];
    },
    fetchCategoriesFailure: (state, action) => {
      state.categoriesLoading = false;
      state.error = action.payload;
    },
    fetchProductDetailSuccess: (state, action) => {
      state.loading = false;
      state.selectedProduct = action.payload;
    },
    fetchFailure: (state, action) => {
      state.loading = false;
      state.allProductsLoading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchStart, fetchAllProductsStart, fetchProductsSuccess, fetchAllProductsSuccess, fetchCategoriesStart, fetchCategoriesSuccess, fetchCategoriesFailure, fetchProductDetailSuccess, fetchFailure } = productSlice.actions;
export default productSlice.reducer;
