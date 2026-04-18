import { useState, useEffect, useCallback } from "react";
import { adminService } from "../services/adminService";

export const useAdmin = () => {
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [approvalsData, statsData] = await Promise.all([
        adminService.getApprovals(),
        adminService.getStats(),
      ]);

      setApprovals(approvalsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = async (id) => {
    try {
      await adminService.approve(id);
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: "approved" } : a
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { approvals, stats, loading, error, approve };
};