import { useState } from "react";
import { useSuperAdmin } from "../hooks/useSuperAdmin";
import { useAuth } from "../../auth/hooks/useAuth";
import AuditTable from "../components/AuditTable";
import SystemConfigForm from "../components/SystemConfigForm";
import MetricsCards from "../components/MetricsCards";
import AdminManagement from "../components/AdminManagement";
import CategoryControl from "../components/CategoryControl";
import FeatureAndSecurityPanel from "../components/FeatureAndSecurityPanel";
import DbShell from "../components/DbShell";
import Button from "../../../components/ui/Button";
import SuperAdminLayout from "../../../components/layout/SuperAdminLayout";
import { LogOut, LayoutDashboard, Database, Activity, ShieldAlert } from 'lucide-react';

const SuperAdminPage = () => {
  const { 
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
  } = useSuperAdmin();
  const { logout } = useAuth();
  const [showDbShell, setShowDbShell] = useState(false);

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert("Logs exported successfully!");
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading root console...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  return (
    <SuperAdminLayout onDbShellOpen={() => setShowDbShell(true)}>
      <main style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          marginBottom: '2.5rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Global Management</h2>
            <p style={{ color: 'var(--text-muted)' }}>Enterprise control center for Mokshith B2B platform</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button 
              variant="secondary" 
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', borderColor: 'var(--error)' }}
            >
              <LogOut size={18} />
              Logout from System
            </Button>
          </div>
        </div>

        <MetricsCards metrics={metrics} />

        <SystemConfigForm config={config} onSave={updateConfig} />

        <FeatureAndSecurityPanel config={config} onSave={updateConfig} />

        <AdminManagement admins={admins} onCreateAdmin={createAdmin} onDeleteAdmin={deleteAdmin} />

        <CategoryControl categories={categories} onCreateCategory={createCategory} onDeleteCategory={deleteCategory} />

        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>System Audit Trail</h3>
          <Button variant="secondary" size="small" onClick={handleExportLogs}>Export Logs</Button>
        </div>
        
        <AuditTable logs={auditLogs} />
      </main>

      {showDbShell && (
        <DbShell 
          onFetchCollection={fetchDbCollection} 
          onClose={() => setShowDbShell(false)} 
        />
      )}
    </SuperAdminLayout>
  );
};

export default SuperAdminPage;
