import { useState, useEffect, useCallback } from "react";
import { analyticsService } from "../services/analyticsService";

export const useAnalytics = () => {
  const [data, setData] = useState({ kpis: [] });
  const [filters, setFilters] = useState({ range: "7d" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getAnalytics(filters);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, filters, setFilters, loading, error };
};