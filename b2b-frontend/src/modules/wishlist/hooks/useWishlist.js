import { useState, useEffect, useCallback } from "react";
import { wishlistService } from "../wishlistService";

export const useWishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wishlistService.getWishlist();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (productId) => {
    const newItem = await wishlistService.addToWishlist(productId);
    setItems((prev) => [newItem, ...prev]);
  };

  const removeItem = async (id) => {
    await wishlistService.removeFromWishlist(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return { items, loading, addItem, removeItem };
};