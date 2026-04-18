import { useState, useEffect, useCallback } from "react";
import { deliveryService } from "../services/deliveryService";

export const useDelivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deliveryService.getDeliveries();
      setDeliveries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  return { deliveries, loading, error };
};