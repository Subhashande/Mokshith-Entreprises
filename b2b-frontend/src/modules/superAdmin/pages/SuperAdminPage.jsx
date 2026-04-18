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

const SuperAdminPage = () => {
  const { config, metrics, admins, categories, auditLogs, loading, error, updateConfig, fetchDbCollection } = useSuperAdmin();
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
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      {/* SuperAdmin Header */}
      <header style={{ 
        backgroundColor: '#0f172a', 
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '4px solid var(--primary)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Root Control Panel</h1>
          <span style={{ 
            fontSize: '0.75rem', 
            backgroundColor: 'var(--error)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px',
            fontWeight: '700'
          }}>
            SUPER_USER
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            variant="secondary" 
            style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={() => setShowDbShell(true)}
          >
            Database Shell
          </Button>
          <Button onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Global Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Enterprise control center for Mokshith B2B platform</p>
        </div>

        <MetricsCards metrics={metrics} />

        <SystemConfigForm config={config} onSave={updateConfig} />

        <FeatureAndSecurityPanel config={config} onSave={updateConfig} />

        <AdminManagement admins={admins} />

        <CategoryControl categories={categories} />

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
    </div>
  );
};

export default SuperAdminPage;
