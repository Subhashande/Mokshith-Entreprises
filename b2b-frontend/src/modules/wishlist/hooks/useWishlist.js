import { useState, useEffect, useCallback } from 'react';
import { wishlistService } from '../services/wishlistService';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await wishlistService.getWishlist();
      const data = response?.data?.data || response?.data || response || {};
      setWishlist({ items: data.items || [] });
    } catch (err) {
      setError(err.message);
      setWishlist({ items: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const addToWishlist = async (productId) => {
    try {
      const response = await wishlistService.addToWishlist(productId);
      const data = response?.data?.data || response?.data || response;
      if (data && data.items) {
        setWishlist({ items: data.items });
      } else {
        await fetchWishlist();
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await wishlistService.removeFromWishlist(productId);
      setWishlist(prev => ({
        ...prev,
        items: (prev.items || []).filter(item => 
          item.product?._id !== productId && item._id !== productId && item.productId?._id !== productId
        )
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const isInWishlist = (productId) => {
    return (wishlist?.items || []).some(item => 
      item.product?._id === productId || 
      item._id === productId || 
      item.productId?._id === productId
    );
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return {
    wishlist,
    loading,
    error,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };
};