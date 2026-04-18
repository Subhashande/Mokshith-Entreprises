import { useSuperAdmin } from "../hooks/useSuperAdmin";
import AuditTable from "../components/AuditTable";
import SystemConfigForm from "../components/SystemConfigForm";

const SuperAdminPage = () => {
  const { auditLogs, config, loading, error, updateConfig } = useSuperAdmin();

  if (loading) return <p>Loading system data...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Super Admin Panel</h1>

      <SystemConfigForm config={config} onSave={updateConfig} />

      <h2>Audit Logs</h2>
      <AuditTable logs={auditLogs} />
    </div>
  );
};

export default SuperAdminPage; 