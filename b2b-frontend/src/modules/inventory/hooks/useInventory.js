import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';

export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInventory = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryService.getInventory(params);
      const data = response?.data?.data || response?.data || response;
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLowStockItems = useCallback(async () => {
    try {
      const response = await inventoryService.getLowStockItems();
      const data = response?.data?.data || response?.data || response;
      setLowStockItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch low stock items:", err);
      setLowStockItems([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await inventoryService.getInventoryStats();
      const data = response?.data?.data || response?.data || response;
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const updateStock = async (id, stockData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryService.updateInventoryStock(id, stockData);
      const data = response?.data?.data || response?.data || response;
      setInventory(prev => Array.isArray(prev) ? prev.map(item => item._id === id ? { ...item, ...data } : item) : []);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchLowStockItems();
    fetchStats();
  }, []);

  return {
    inventory,
    lowStockItems,
    stats,
    loading,
    error,
    fetchInventory,
    fetchLowStockItems,
    fetchStats,
    updateStock
  };
};