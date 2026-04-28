import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { orderService } from "../services/orderService";
import { 
  fetchStart, 
  fetchOrdersSuccess, 
  fetchFailure 
} from "../orderSlice";
import { 
  addToCart as addToCartAction, 
  removeFromCart as removeFromCartAction, 
  updateCartQuantity as updateQuantityAction,
  clearCart as clearCartAction 
} from "../../cart/cartSlice";

export const useOrder = (shouldFetch = false) => {
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.order);
  const { items: cart } = useSelector((state) => state.cart);

  const fetchOrders = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const response = await orderService.getOrders();
      dispatch(fetchOrdersSuccess(response.data || response));
    } catch (err) {
      dispatch(fetchFailure(err.message || err));
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
      //  CART SHOULD ONLY BE CLEARED AFTER SUCCESSFUL PAYMENT
      // dispatch(clearCartAction()); 
      await fetchOrders();
      return newOrder;
    } catch (err) {
      dispatch(fetchFailure(err.message || err));
      throw err;
    }
  };

  useEffect(() => {
    if (shouldFetch) {
      fetchOrders();
    }
  }, [shouldFetch, fetchOrders]);

  return { 
    orders, 
    cart, 
    loading, 
    error, 
    addToCart, 
    removeFromCart, 
    updateQuantity,
    clearCart, 
    placeOrder,
    fetchOrders
  };
};