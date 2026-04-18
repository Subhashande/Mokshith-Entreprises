import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { superAdminService } from "../services/superAdminService";
import { 
  fetchStart, 
  fetchConfigSuccess, 
  updateConfigSuccess,
  fetchMetricsSuccess,
  fetchAdminsSuccess,
  fetchCategoriesSuccess,
  fetchAuditLogsSuccess,
  fetchFailure,
  toggleMaintenance
} from "../superAdminSlice";

export const useSuperAdmin = () => {
  const dispatch = useDispatch();
  const { config, metrics, admins, categories, auditLogs, loading, error } = useSelector((state) => state.superAdmin);

  const fetchSuperAdminData = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const [configData, metricsData, auditLogsData, adminsData, categoriesData] = await Promise.all([
        superAdminService.getConfig(),
        superAdminService.getMetrics(),
        superAdminService.getAuditLogs(),
        superAdminService.getAdmins(),
        superAdminService.getCategories(),
      ]);

      dispatch(fetchConfigSuccess(configData));
      dispatch(fetchMetricsSuccess(metricsData));
      dispatch(fetchAuditLogsSuccess(auditLogsData));
      dispatch(fetchAdminsSuccess(adminsData));
      dispatch(fetchCategoriesSuccess(categoriesData));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  const updateConfig = async (payload) => {
    try {
      const updatedConfig = await superAdminService.updateConfig(payload);
      dispatch(updateConfigSuccess(updatedConfig.data));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDbCollection = async (name) => {
    try {
      return await superAdminService.getDbCollection(name);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, [fetchSuperAdminData]);

  return { config, metrics, admins, categories, auditLogs, loading, error, updateConfig, fetchDbCollection };
};