import { useState, useEffect, useCallback } from "react";
import { deliveryService } from "../services/deliveryService";
import { socket } from "../../../services/socket";

export const useDelivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      const data = await deliveryService.getDeliveries();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setDeliveries([]);
    }
  }, []);

  const updateDeliveryStatus = async (id, status) => {
    try {
      await deliveryService.updateStatus(id, status);
      setDeliveries((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((d) => (d._id === id ? { ...d, status } : d));
      });
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err);
    });

    socket.on('delivery:statusUpdated', (updatedShipment) => {
      setDeliveries((prev) => {
        if (!Array.isArray(prev)) return [updatedShipment];
        return prev.map((d) => d._id === updatedShipment._id ? updatedShipment : d);
      });
    });

    socket.on('delivery:locationUpdated', ({ id, location }) => {
      setDeliveries((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((d) => d._id === id ? { ...d, currentLocation: location } : d);
      });
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('delivery:statusUpdated');
      socket.off('delivery:locationUpdated');
    };
  }, [fetchDeliveries]);

  return { deliveries, loading, error, updateDeliveryStatus, fetchDeliveries };
};