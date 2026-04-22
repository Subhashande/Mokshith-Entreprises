import { createSlice } from '@reduxjs/toolkit';

const getStoredToken = () => {
  const token = localStorage.getItem('token');
  if (token === "undefined" || token === "null") {
    localStorage.removeItem('token');
    return null;
  }
  return token;
};

const getStoredUser = () => {
  const user = localStorage.getItem('user');
  if (user === "undefined" || user === "null") {
    localStorage.removeItem('user');
    return null;
  }
  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const initialState = {
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.loading = false;
      state.isAuthenticated = !!token;
      state.user = user;
      state.token = token;
      
      if (user) localStorage.setItem('user', JSON.stringify(user));
      if (token) localStorage.setItem('token', token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, 
  updateUser,
  logout 
} = authSlice.actions;
export default authSlice.reducer;
