import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart } from '../modules/cart/cartSlice';

/**
 * Hook to initialize cart from backend when user logs in
 * Place in App.jsx or main layout component
 */
export const useCartInitializer = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);
};
