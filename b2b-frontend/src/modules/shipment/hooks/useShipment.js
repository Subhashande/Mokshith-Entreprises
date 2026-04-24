import { useState, useEffect, useCallback } from 'react';
import { shipmentService } from '../services/shipmentService';
import { useSocket } from '../../../context/SocketContext';

export const useShipment = (shipmentId) => {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { on } = useSocket();

  const fetchShipment = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await shipmentService.getShipmentDetails(id);
      setShipment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id, statusData) => {
    setLoading(true);
    try {
      const data = await shipmentService.updateShipmentStatus(id, statusData);
      setShipment(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipmentId) {
      fetchShipment(shipmentId);
    }

    const offShipmentUpdated = on('shipment:updated', (data) => {
      if (data.shipmentId === shipmentId) {
        setShipment(prev => ({ ...prev, ...data.update }));
      }
    });

    const offLocationUpdate = on('locationUpdate', (data) => {
      if (data.shipmentId === shipmentId) {
        setShipment(prev => ({ ...prev, currentLocation: data.location }));
      }
    });

    return () => {
      offShipmentUpdated();
      offLocationUpdate();
    };
  }, [shipmentId, fetchShipment, on]);

  return {
    shipment,
    loading,
    error,
    fetchShipment,
    updateStatus
  };
};