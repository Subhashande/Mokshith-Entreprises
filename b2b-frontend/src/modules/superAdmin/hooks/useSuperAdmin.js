import { useState, useEffect, useCallback } from "react";
import { superAdminService } from "../services/superAdminService";

export const useSuperAdmin = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, cfg] = await Promise.all([
        superAdminService.getAuditLogs(),
        superAdminService.getConfig(),
      ]);

      setAuditLogs(logs);
      setConfig(cfg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = async (newConfig) => {
    try {
      const updated = await superAdminService.updateConfig(newConfig);
      setConfig(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { auditLogs, config, loading, error, updateConfig };
};