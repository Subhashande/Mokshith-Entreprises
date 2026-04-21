import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';

const DeliveryLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
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
          <Button variant="secondary" size="small" onClick={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            Logout
          </Button>
        </div>
      </header>
      <main style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default DeliveryLayout;