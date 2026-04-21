import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  User
} from 'lucide-react';
import { routes } from '../../routes/routeConfig';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import ConfirmDialog from '../feedback/ConfirmDialog';

const AdminLayout = ({ children, title = "Admin Panel" }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: routes.ADMIN },
    { icon: <Users size={20} />, label: "Users", path: routes.ADMIN_USERS },
    { icon: <Package size={20} />, label: "Orders", path: routes.ADMIN_ORDERS },
    { icon: <Package size={20} />, label: "Products", path: routes.ADMIN_PRODUCTS },
    { icon: <ShieldCheck size={20} />, label: "Approvals", path: routes.ADMIN_APPROVALS },
  ];

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: isSidebarOpen ? '260px' : '80px', 
        backgroundColor: '#000000', 
        color: 'white',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 100
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ backgroundColor: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
            <ShieldCheck size={24} />
          </div>
          {isSidebarOpen && <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>Mokshith</span>}
        </div>

        <nav style={{ flex: 1, padding: '1.5rem 0' }}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={index} 
                to={item.path}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem 1.5rem',
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {item.icon}
                {isSidebarOpen && <span style={{ fontWeight: '600' }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        marginLeft: isSidebarOpen ? '260px' : '80px', 
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{ 
          height: '70px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000000' }}
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#000000' }}>{title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                style={{ 
                  padding: '0.5rem 1rem 0.5rem 2.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  width: '250px'
                }}
              />
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000000', position: 'relative' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--accent)', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '10px' }}>3</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#000000', margin: 0 }}>{user?.name || 'Admin'}</p>
                <p style={{ fontSize: '0.75rem', color: '#4b5563', margin: 0 }}>{user?.role}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                {user?.name?.[0] || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: '2rem', flex: 1 }}>
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
        />
      )}
    </div>
  );
};

export default AdminLayout;