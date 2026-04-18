import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../modules/auth/authSlice';
import adminReducer from '../modules/admin/adminSlice';
import superAdminReducer from '../modules/superAdmin/superAdminSlice';
import productReducer from '../modules/product/productSlice';
import orderReducer from '../modules/order/orderSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  admin: adminReducer,
  superAdmin: superAdminReducer,
  product: productReducer,
  order: orderReducer,
});

export default rootReducer;
