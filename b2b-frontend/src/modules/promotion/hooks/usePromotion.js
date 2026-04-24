import { useState, useEffect, useCallback } from 'react';
import { promotionService } from '../services/promotionService';

export const usePromotion = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await promotionService.getPromotions();
      const data = response?.data?.data || response?.data || response;
      setPromotions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPromotion = async (promotionData) => {
    setLoading(true);
    try {
      const response = await promotionService.createPromotion(promotionData);
      const data = response?.data?.data || response?.data || response;
      setPromotions(prev => Array.isArray(prev) ? [...prev, data] : [data]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePromotion = async (id, promotionData) => {
    setLoading(true);
    try {
      const response = await promotionService.updatePromotion(id, promotionData);
      const data = response?.data?.data || response?.data || response;
      setPromotions(prev => Array.isArray(prev) ? prev.map(p => p._id === id ? data : p) : [data]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = async (id) => {
    setLoading(true);
    try {
      await promotionService.deletePromotion(id);
      setPromotions(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      const data = await promotionService.togglePromotionStatus(id);
      setPromotions(prev => prev.map(p => p._id === id ? data : p));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  return {
    promotions,
    loading,
    error,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    toggleStatus
  };
};