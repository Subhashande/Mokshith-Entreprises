import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';
import ConfirmDialog from '../feedback/ConfirmDialog';

const DeliveryLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate(routes.LANDING);
  };

  return (
    <div className="delivery-layout" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <header style={{ 
        backgroundColor: '#000000', 
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderBottom: '2px solid var(--primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>D</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Delivery Portal</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.8 }}>{user?.name}</span>
          <Button variant="secondary" size="small" onClick={() => setShowLogoutConfirm(true)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            Logout
          </Button>
        </div>
      </header>

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

      <main style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default DeliveryLayout;