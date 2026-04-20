import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  config: {
    siteName: "Mokshith Enterprises",
    supportEmail: "support@mokshith.com",
    maintenanceMode: false,
    allowRegistration: true,
    defaultCurrency: "INR",
    orderCutoffTime: "18:00",
    maxCreditLimit: 1000000,
    enableCOD: true,
    commissionRate: 5,
    featureFlags: {
      creditSystem: true,
      cod: true,
      notifications: true,
      reviews: true,
      recommendations: true,
      dynamicPricing: false,
    }
  },
  metrics: {
    totalUsers: 0,
    activeVendors: 0,
    ordersToday: 0,
    revenueToday: 0,
    pendingApprovals: 0
  },
  admins: [],
  categories: [],
  auditLogs: [],
  loading: false,
  error: null,
};

const superAdminSlice = createSlice({
  name: 'superAdmin',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchConfigSuccess: (state, action) => {
      state.loading = false;
      const data = action.payload.data || action.payload;
      state.config = { ...state.config, ...data };
    },
    updateConfigSuccess: (state, action) => {
      const data = action.payload.data || action.payload;
      state.config = { ...state.config, ...data };
    },
    fetchMetricsSuccess: (state, action) => {
      state.metrics = action.payload.data || action.payload;
    },
    fetchAdminsSuccess: (state, action) => {
      state.admins = action.payload.data || action.payload;
    },
    fetchCategoriesSuccess: (state, action) => {
      state.categories = action.payload.data || action.payload;
    },
    fetchAuditLogsSuccess: (state, action) => {
      state.auditLogs = action.payload.data || action.payload;
    },
    fetchFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    toggleMaintenance: (state) => {
      state.config.maintenanceMode = !state.config.maintenanceMode;
    }
  },
});

export const { 
  fetchStart, 
  fetchConfigSuccess, 
  updateConfigSuccess,
  fetchMetricsSuccess,
  fetchAdminsSuccess,
  fetchCategoriesSuccess,
  fetchAuditLogsSuccess,
  fetchFailure,
  toggleMaintenance
} = superAdminSlice.actions;

export default superAdminSlice.reducer;
