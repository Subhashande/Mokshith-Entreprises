import { useState, useEffect, useCallback } from "react";
import { deliveryService } from "../services/deliveryService";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const useDelivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveryService.getDeliveries();
      setDeliveries(data || []);
    } catch (err) {
      console.error("Delivery API failed:", err);
      setError("Unable to sync deliveries at this time.");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDeliveryStatus = async (id, status) => {
    try {
      await deliveryService.updateStatus(id, status);
      // Real-time update will be handled by socket, but we can optimistically update
      setDeliveries((prev) =>
        prev.map((d) => (d._id === id ? { ...d, status } : d))
      );
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    
    // Setup Socket connection
    const socket = io("http://localhost:5000", {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err);
    });

    socket.on('delivery:statusUpdated', (updatedShipment) => {
      setDeliveries((prev) => 
        prev.map((d) => d._id === updatedShipment._id ? updatedShipment : d)
      );
    });

    socket.on('delivery:locationUpdated', ({ id, location }) => {
      setDeliveries((prev) => 
        prev.map((d) => d._id === id ? { ...d, currentLocation: location } : d)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchDeliveries]);

  return { deliveries, loading, error, updateDeliveryStatus, fetchDeliveries };
};