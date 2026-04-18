import { useState, useEffect, useCallback } from "react";
import { settingsService } from "../settingsService";

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (payload) => {
    try {
      const updated = await settingsService.updateSettings(payload);
      setSettings(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, updateSettings };
};