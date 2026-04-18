import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { adminService } from "../services/adminService";
import { 
  fetchStart, 
  fetchStatsSuccess, 
  fetchApprovalsSuccess, 
  fetchFailure, 
  updateApprovalStatus 
} from "../adminSlice";

export const useAdmin = () => {
  const dispatch = useDispatch();
  const { stats, approvals, loading, error } = useSelector((state) => state.admin);

  const fetchAdminData = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const [approvalsData, statsData] = await Promise.all([
        adminService.getApprovals(),
        adminService.getStats(),
      ]);

      dispatch(fetchApprovalsSuccess(approvalsData));
      dispatch(fetchStatsSuccess(statsData));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  const approve = async (id) => {
    try {
      await adminService.approve(id);
      dispatch(updateApprovalStatus({ id, status: "approved" }));
    } catch (err) {
      console.error(err);
    }
  };

  const reject = async (id) => {
    try {
      await adminService.reject(id);
      dispatch(updateApprovalStatus({ id, status: "rejected" }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      return await adminService.getLogs();
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { approvals, stats, loading, error, approve, reject, fetchLogs };
};