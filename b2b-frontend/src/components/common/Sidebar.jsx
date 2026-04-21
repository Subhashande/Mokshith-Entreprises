import React from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';

const Sidebar = ({ isOpen, onClose, user, onLogout }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      justifyContent: 'flex-end',
      transition: 'opacity 0.3s ease'
    }} onClick={onClose}>
      <div 
        style={{
          width: '320px',
          height: '100%',
          backgroundColor: 'white',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          animation: 'slideIn 0.3s ease-out'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Menu</h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            &times;
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            backgroundColor: 'white', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', fontWeight: '800', color: 'var(--primary)', 
            fontSize: '1.5rem', margin: '0 auto 1rem' 
          }}>
            {user?.name?.[0] || 'U'}
          </div>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>{user?.name}</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user?.email}</p>
          <span style={{ 
            display: 'inline-block', marginTop: '0.75rem', 
            padding: '0.2rem 0.5rem', backgroundColor: 'var(--primary)', 
            color: 'white', fontSize: '0.65rem', borderRadius: '4px', 
            fontWeight: '700', textTransform: 'uppercase' 
          }}>
            {user?.role}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <SidebarLink icon="👤" label="My Profile" onClick={() => { navigate(routes.PROFILE || '#'); onClose(); }} />
          <SidebarLink icon="📦" label="My Orders" onClick={() => { navigate(routes.ORDERS); onClose(); }} />
          <SidebarLink icon="💳" label="Credit Balance" onClick={() => { navigate(routes.CREDIT); onClose(); }} />
          <SidebarLink icon="🏢" label="Business Details" onClick={() => { navigate('#'); onClose(); }} />
          <SidebarLink icon="🛡️" label="Security" onClick={() => { navigate('#'); onClose(); }} />
          <SidebarLink icon="❓" label="Help & Support" onClick={() => { navigate('#'); onClose(); }} />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <Button 
            variant="secondary" 
            style={{ width: '100%', justifyContent: 'center', color: 'var(--error)', borderColor: 'var(--error)' }}
            onClick={onLogout}
          >
            Logout
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

const SidebarLink = ({ icon, label, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', alignItems: 'center', gap: '1rem', 
      padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', 
      cursor: 'pointer', transition: 'background 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <span style={{ fontSize: '1.25rem' }}>{icon}</span>
    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{label}</span>
  </div>
);

export default Sidebar;
