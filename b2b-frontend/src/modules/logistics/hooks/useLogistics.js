import { useState, useEffect, useCallback } from 'react';
import { logisticsService } from '../services/logisticsService';
import { useSocket } from '../../../context/SocketContext';

export const useLogistics = () => {
  const [deliveryQueue, setDeliveryQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { on } = useSocket();

  const fetchDeliveryQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await logisticsService.getDeliveryQueue();
      setDeliveryQueue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveryHistory = useCallback(async () => {
    try {
      const data = await logisticsService.getDeliveryHistory();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch delivery history:", err);
    }
  }, []);

  const acceptDelivery = async (id) => {
    setLoading(true);
    try {
      const data = await logisticsService.acceptDelivery(id);
      setDeliveryQueue(prev => prev.map(item => item._id === id ? { ...item, status: 'ACCEPTED' } : item));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startDelivery = async (id) => {
    setLoading(true);
    try {
      const data = await logisticsService.startDelivery(id);
      setDeliveryQueue(prev => prev.map(item => item._id === id ? { ...item, status: 'OUT_FOR_DELIVERY' } : item));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markDelivered = async (id, data = {}) => {
    setLoading(true);
    try {
      const result = await logisticsService.markDelivered(id, data);
      setDeliveryQueue(prev => prev.filter(item => item._id !== id));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryQueue();
    fetchDeliveryHistory();

    const offDeliveryAssigned = on('delivery:assigned', (data) => {
      setDeliveryQueue(prev => [...prev, data.delivery]);
    });

    const offOrderUpdated = on('orderUpdated', (data) => {
      setDeliveryQueue(prev => prev.map(item => 
        item._id === data.deliveryId ? { ...item, ...data } : item
      ));
    });

    const offLocationUpdate = on('locationUpdate', (data) => {
      setDeliveryQueue(prev => prev.map(item =>
        item._id === data.deliveryId ? { ...item, currentLocation: data.location } : item
      ));
    });

    return () => {
      offDeliveryAssigned();
      offOrderUpdated();
      offLocationUpdate();
    };
  }, []);

  return {
    deliveryQueue,
    history,
    loading,
    error,
    fetchDeliveryQueue,
    fetchDeliveryHistory,
    acceptDelivery,
    startDelivery,
    markDelivered
  };
};