import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';
import ConfirmDialog from '../feedback/ConfirmDialog';
import styles from './SuperAdminLayout.module.css';

const SuperAdminLayout = ({ children, onDbShellOpen }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Root Control Panel</h1>
          <span className={styles.badge}>
            SUPER_USER
          </span>
        </div>
        <div className={styles.headerRight}>
          {onDbShellOpen && (
            <Button 
              variant="secondary" 
              className={styles.dbShellButton}
              onClick={onDbShellOpen}
            >
              Database Shell
            </Button>
          )}
          <Button onClick={() => setShowLogoutConfirm(true)}>
            Logout
          </Button>
        </div>
      </header>
      <main>
        {children}
      </main>

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

export default SuperAdminLayout;