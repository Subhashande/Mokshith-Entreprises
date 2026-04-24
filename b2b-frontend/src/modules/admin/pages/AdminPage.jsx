import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { useAuth } from "../../auth/hooks/useAuth";
import { routes } from "../../../routes/routeConfig";
import AdminStats from "../components/AdminStats";
import ApprovalCard from "../components/ApprovalCard";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Building2, 
  FileText, 
  Settings, 
  Bell, 
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Download,
  ShieldCheck
} from 'lucide-react';

const AdminPage = () => {
  const { approvals, stats, loading, error, approve, reject, fetchLogs } = useAdmin();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { icon: <Package size={20} />, label: "Manage Orders", path: routes.ADMIN_ORDERS, color: "blue" },
    { icon: <Plus size={20} />, label: "Add Product", path: routes.ADMIN_PRODUCTS, color: "green" },
    { icon: <TrendingUp size={20} />, label: "View Analytics", path: routes.ADMIN_ANALYTICS, color: "purple" },
    { icon: <Users size={20} />, label: "User Management", path: routes.ADMIN_USERS, color: "orange" },
    { icon: <Package size={20} />, label: "Inventory", path: "/admin/inventory", color: "red" },
    { icon: <Building2 size={20} />, label: "Warehouses", path: "/admin/warehouses", color: "indigo" },
  ];

  const handleAction = (action) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action === "export") {
      handleExportReport();
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
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loader"></div>
      <p>Loading administration panel...</p>
    </div>
  );

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Overview</h1>
            <p>Welcome back, {user?.name}. Here's what's happening today.</p>
          </div>
          <div className="header-right">
            <button className="premium-button premium-button-secondary">
              <Bell size={18} />
            </button>
            <button className="premium-button premium-button-primary" onClick={() => navigate(routes.ADMIN_PRODUCTS)}>
              <Plus size={18} /> <span>New Product</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-section">
          <AdminStats stats={stats} />
        </section>

        <div className="dashboard-grid">
          {/* Quick Actions */}
          <section className="actions-section">
            <h2 className="section-title">Quick Actions</h2>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <button 
                  key={index} 
                  className={`action-card color-${action.color}`}
                  onClick={() => handleAction(action)}
                >
                  <div className="action-icon">{action.icon}</div>
                  <span className="action-label">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Pending Approvals */}
          <section className="approvals-section">
            <div className="section-header">
              <h2 className="section-title">Pending Approvals</h2>
              <Link to={routes.ADMIN_APPROVALS} className="view-all">View All <ArrowUpRight size={16} /></Link>
            </div>
            <div className="approvals-list">
              {approvals?.length > 0 ? (
                approvals.slice(0, 3).map((approval, index) => (
                  <ApprovalCard 
                    key={approval._id || `approval-${index}`} 
                    approval={approval} 
                    onApprove={approve} 
                    onReject={reject} 
                  />
                ))
              ) : (
                <div className="empty-approvals">
                  <ShieldCheck size={40} />
                  <p>All clear! No pending approvals.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .dashboard-container {
          background-color: var(--background);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .dashboard-main {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 3rem 2rem;
          flex: 1;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }

        .header-left h1 {
          font-size: 2.25rem;
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .header-left p {
          color: #4b5563;
          font-size: 1.125rem;
        }

        .header-right {
          display: flex;
          gap: 1rem;
        }

        .stats-section {
          margin-bottom: 3rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 3rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #000000;
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary);
        }

        .action-icon {
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .color-blue .action-icon { background: #eff6ff; color: #2563eb; }
        .color-green .action-icon { background: #f0fdf4; color: #16a34a; }
        .color-purple .action-icon { background: #faf5ff; color: #9333ea; }
        .color-orange .action-icon { background: #fff7ed; color: #ea580c; }

        .action-label {
          font-weight: 600;
          color: var(--text-main);
          font-size: 0.9375rem;
        }

        .approvals-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-approvals {
          padding: 4rem;
          background: var(--surface);
          border: 1.5px dashed var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: var(--text-muted);
        }

        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }

        .loader {
          width: 48px;
          height: 48px;
          border: 4px solid var(--primary-light);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPage;