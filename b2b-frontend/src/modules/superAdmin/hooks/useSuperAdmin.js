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

  const createAdmin = async (payload) => {
    try {
      const response = await superAdminService.createAdmin(payload);
      const newAdmin = response.data || response;
      const updatedAdmins = [...admins, newAdmin];
      dispatch(fetchAdminsSuccess(updatedAdmins));
      return true;
    } catch (err) {
      console.error(err);
      throw err; // Re-throw so the component can catch it
    }
  };

  const deleteAdmin = async (id) => {
    try {
      await superAdminService.deleteAdmin(id);
      const updatedAdmins = admins.filter(admin => (admin.id || admin._id) !== id);
      dispatch(fetchAdminsSuccess(updatedAdmins));
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const createCategory = async (payload) => {
    try {
      const response = await superAdminService.createCategory(payload);
      const newCategory = response.data || response;
      const updatedCategories = [...categories, newCategory];
      dispatch(fetchCategoriesSuccess(updatedCategories));
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await superAdminService.deleteCategory(id);
      const updatedCategories = categories.filter(cat => (cat.id || cat._id) !== id);
      dispatch(fetchCategoriesSuccess(updatedCategories));
      return true;
    } catch (err) {
      console.error(err);
      throw err;
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

  return { 
    config, 
    metrics, 
    admins, 
    categories, 
    auditLogs, 
    loading, 
    error, 
    updateConfig, 
    createAdmin,
    deleteAdmin,
    createCategory,
    deleteCategory,
    fetchDbCollection 
  };
};