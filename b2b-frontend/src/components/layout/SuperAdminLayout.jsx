import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';

const SuperAdminLayout = ({ children, onDbShellOpen }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <header style={{ 
        backgroundColor: '#000000', 
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
          {onDbShellOpen && (
            <Button 
              variant="secondary" 
              style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              onClick={onDbShellOpen}
            >
              Database Shell
            </Button>
          )}
          <Button onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default SuperAdminLayout;