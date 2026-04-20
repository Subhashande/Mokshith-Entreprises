import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stats: null,
  approvals: [],
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchStatsSuccess: (state, action) => {
      state.loading = false;
      state.stats = action.payload.data || action.payload;
    },
    fetchApprovalsSuccess: (state, action) => {
      state.loading = false;
      state.approvals = action.payload.data || action.payload;
    },
    fetchFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateApprovalStatus: (state, action) => {
      const { id, status } = action.payload;
      const index = state.approvals.findIndex(a => a.id === id);
      if (index !== -1) {
        state.approvals[index].status = status;
      }
    },
  },
});

export const { 
  fetchStart, 
  fetchStatsSuccess, 
  fetchApprovalsSuccess, 
  fetchFailure, 
  updateApprovalStatus 
} = adminSlice.actions;

export default adminSlice.reducer;
