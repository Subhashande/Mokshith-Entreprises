import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

export const useAnalytics = () => {
  const [dashboard, setDashboard] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [orderTrends, setOrderTrends] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsService.getDashboard();
      const data = response?.data?.data || response?.data || response;
      
      if (data) {
        setDashboard(data.dashboard || data);
        if (data.salesData) setSalesData(data.salesData);
        if (data.orderTrends) setOrderTrends(data.orderTrends);
        if (data.categoryData) setCategoryData(data.categoryData);
        if (data.topProducts) setTopProducts(data.topProducts);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboard,
    salesData,
    orderTrends,
    categoryData,
    topProducts,
    loading,
    error,
    fetchDashboard,
    fetchSalesData,
    fetchOrderTrends,
    fetchCategoryDistribution,
    fetchTopProducts
  };
};