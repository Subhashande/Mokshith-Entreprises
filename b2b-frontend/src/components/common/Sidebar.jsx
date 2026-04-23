import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { 
  User, 
  Package, 
  CreditCard, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut, 
  X,
  LayoutDashboard,
  Users,
  Building2,
  BarChart3
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, user, onLogout }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const adminLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: routes.ADMIN },
    { icon: <Users size={18} />, label: "Manage Users", path: routes.ADMIN_USERS },
    { icon: <Package size={18} />, label: "Products", path: routes.ADMIN_PRODUCTS },
    { icon: <Package size={18} />, label: "Orders", path: routes.ADMIN_ORDERS },
    { icon: <Building2 size={18} />, label: "Vendors", path: routes.ADMIN_VENDORS },
    { icon: <BarChart3 size={18} />, label: "Analytics", path: routes.SUPER_ADMIN },
  ];

  const customerLinks = [
    { icon: <User size={18} />, label: "My Profile", path: routes.PROFILE },
    { icon: <Package size={18} />, label: "My Orders", path: routes.ORDERS },
    { icon: <CreditCard size={18} />, label: "Credit Balance", path: routes.CREDIT },
    { icon: <Shield size={18} />, label: "Security", path: routes.SECURITY },
    { icon: <HelpCircle size={18} />, label: "Help & Support", path: routes.HELP },
  ];

  const links = (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") ? adminLinks : customerLinks;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-text">Mokshith</span>
            <span className="logo-badge">B2B</span>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar overflow-hidden">
            {user?.profileImage ? (
              <img 
                src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.profileImage}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="user-info">
            <h3>{user?.name}</h3>
            <p>{user?.email}</p>
            <span className="user-role-badge">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-section-title">Navigation</p>
            {links.map((link, index) => (
              <button 
                key={index}
                className="nav-item"
                onClick={() => { navigate(link.path); onClose(); }}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <style>{`
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          background-color: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: flex-end;
        }

        .sidebar-drawer {
          width: 320px;
          height: 100%;
          background: white;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .sidebar-header {
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .logo-badge {
          background-color: var(--primary);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.125rem 0.4rem;
          border-radius: var(--radius-sm);
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: var(--transition-fast);
        }

        .close-button:hover {
          background-color: var(--background);
          color: var(--text-main);
        }

        .sidebar-user {
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background-color: var(--primary-light);
          margin: 1.5rem 1.5rem 0.5rem;
          border-radius: var(--radius-lg);
        }

        .user-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background-color: white;
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.25rem;
          box-shadow: var(--shadow-sm);
        }

        .user-info h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.125rem;
        }

        .user-info p {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          word-break: break-all;
        }

        .user-role-badge {
          display: inline-block;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          background-color: var(--primary);
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          letter-spacing: 0.05em;
        }

        .sidebar-nav {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
        }

        .nav-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
          padding-left: 0.5rem;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          background: none;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .nav-item:hover {
          background-color: var(--background);
          color: var(--primary);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: inherit;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .logout-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          border-radius: var(--radius-md);
          color: var(--error);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-button:hover {
          background-color: #fee2e2;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;