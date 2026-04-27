import { useState, useEffect, useCallback } from "react";
import { deliveryService } from "../services/deliveryService";
import { useSocket } from "../../../context/SocketContext";

export const useDelivery = () => {
  const { socket, isConnected } = useSocket();
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

    if (!socket) return;

    const onStatusUpdated = (updatedShipment) => {
      setDeliveries((prev) => {
        if (!Array.isArray(prev)) return [updatedShipment];
        return prev.map((d) => d._id === updatedShipment._id ? updatedShipment : d);
      });
    };

    const onLocationUpdated = ({ id, location }) => {
      setDeliveries((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((d) => d._id === id ? { ...d, currentLocation: location } : d);
      });
    };

    socket.on('delivery:statusUpdated', onStatusUpdated);
    socket.on('delivery:locationUpdated', onLocationUpdated);

    return () => {
      socket.off('delivery:statusUpdated', onStatusUpdated);
      socket.off('delivery:locationUpdated', onLocationUpdated);
    };
  }, [fetchDeliveries, socket]);

  return { deliveries, loading, error, updateDeliveryStatus, fetchDeliveries };
};