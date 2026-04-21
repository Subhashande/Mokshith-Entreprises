import { useAdmin } from "../hooks/useAdmin";
import { useAuth } from "../../auth/hooks/useAuth";
import ApprovalCard from "../components/ApprovalCard";
import AdminStats from "../components/AdminStats";
import Button from "../../../components/ui/Button";
import { routes } from "../../../routes/routeConfig";
import { Link, useNavigate } from "react-router-dom";

const AdminPage = () => {
  const { approvals, stats, loading, error, approve, reject, fetchLogs } = useAdmin();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleQuickAction = (action) => {
    switch (action) {
      case "Manage Orders":
        navigate(routes.ADMIN_ORDERS);
        break;
      case "Add New Product":
        navigate(routes.ADMIN_PRODUCTS);
        break;
      case "Export Sales Report":
        handleExportReport();
        break;
      case "User Management":
        navigate(routes.ADMIN_USERS);
        break;
      case "Platform Settings":
        navigate(routes.SUPER_ADMIN); // Redirect to Super Admin settings
        break;
      default:
        alert(`Quick Action: ${action}`);
    }
  };

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      stats: stats,
      approvals: approvals
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert("Sales report exported successfully!");
  };

  const handleViewLogs = async () => {
    const logs = await fetchLogs();
    console.table(logs);
    alert("System Logs have been retrieved and displayed in the browser console for security review.");
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Loading management console...</p>
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
      {/* Admin Header */}
      <header style={{ 
        backgroundColor: 'var(--text-main)', 
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Admin Console</h1>
          <span style={{ 
            fontSize: '0.75rem', 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            padding: '0.2rem 0.5rem', 
            borderRadius: '4px' 
          }}>
            v1.0.4
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button 
            variant="secondary" 
            style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={handleViewLogs}
          >
            System Logs
          </Button>
          <Button onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Overview</h2>
          <p style={{ color: 'var(--text-muted)' }}>Real-time platform performance and pending actions</p>
        </div>

        <AdminStats stats={stats} />

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Pending Approvals</h3>
              <Link to={routes.ADMIN} style={{ fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', color: 'var(--primary)' }}>View All</Link>
            </div>
            
            {approvals.length > 0 ? (
              approvals.map((a) => (
                <ApprovalCard 
                  key={a.id} 
                  approval={a} 
                  onApprove={approve} 
                  onReject={reject}
                />
              ))
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                <p style={{ color: 'var(--text-muted)' }}>No pending approvals at this time.</p>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Button 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleQuickAction("Manage Orders")}
              >
                📦 Manage All Orders
              </Button>
              <Button 
                variant="secondary" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleQuickAction("Add New Product")}
              >
                Add New Product
              </Button>
              <Button 
                variant="secondary" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleQuickAction("Export Sales Report")}
              >
                Export Sales Report
              </Button>
              <Button 
                variant="secondary" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleQuickAction("User Management")}
              >
                User Management
              </Button>
              <Button 
                variant="secondary" 
                style={{ justifyContent: 'flex-start' }}
                onClick={() => handleQuickAction("Platform Settings")}
              >
                Platform Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
