import { useState, useEffect, useCallback } from 'react';
import { warehouseService } from '../services/warehouseService';

export const useWarehouse = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await warehouseService.getWarehouses();
      const data = response?.data?.data || response?.data || response;
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWarehouse = async (warehouseData) => {
    setLoading(true);
    try {
      const response = await warehouseService.createWarehouse(warehouseData);
      const data = response?.data?.data || response?.data || response;
      setWarehouses(prev => Array.isArray(prev) ? [...prev, data] : [data]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWarehouse = async (id, warehouseData) => {
    setLoading(true);
    try {
      const response = await warehouseService.updateWarehouse(id, warehouseData);
      const data = response?.data?.data || response?.data || response;
      setWarehouses(prev => Array.isArray(prev) ? prev.map(w => w._id === id ? data : w) : [data]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteWarehouse = async (id) => {
    setLoading(true);
    try {
      await warehouseService.deleteWarehouse(id);
      setWarehouses(prev => prev.filter(w => w._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  return {
    warehouses,
    loading,
    error,
    fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse
  };
};