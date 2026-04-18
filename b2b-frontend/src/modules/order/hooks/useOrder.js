import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { orderService } from "../services/orderService";
import { 
  fetchStart, 
  fetchOrdersSuccess, 
  addToCart as addToCartAction, 
  removeFromCart as removeFromCartAction, 
  updateQuantity as updateQuantityAction,
  clearCart as clearCartAction, 
  fetchFailure 
} from "../orderSlice";

export const useOrder = () => {
  const dispatch = useDispatch();
  const { orders, cart, loading, error } = useSelector((state) => state.order);

  const fetchOrders = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const data = await orderService.getOrders();
      dispatch(fetchOrdersSuccess(data));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  const addToCart = (product) => {
    dispatch(addToCartAction(product));
    // Persistence could be added here if needed
  };

  const removeFromCart = (productId) => {
    dispatch(removeFromCartAction(productId));
  };

  const updateQuantity = (productId, quantity) => {
    dispatch(updateQuantityAction({ id: productId, quantity }));
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  const placeOrder = async (orderData) => {
    dispatch(fetchStart());
    try {
      const newOrder = await orderService.placeOrder(orderData);
      dispatch(clearCartAction());
      await fetchOrders();
      return newOrder;
    } catch (err) {
      dispatch(fetchFailure(err.message));
      throw err;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { 
    orders, 
    cart, 
    loading, 
    error, 
    addToCart, 
    removeFromCart, 
    updateQuantity,
    clearCart, 
    placeOrder 
  };
};