import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { routes } from '../../routes/routeConfig';
import styles from './RoleGuard.module.css';

const RoleGuard = ({ children, allowedRoles, roles }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
  const effectiveRoles = roles || allowedRoles || [];

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loader}></div>
      <p className={styles.loadingText}>Checking permissions...</p>
    </div>
  );

  if (!isAuthenticated) {
    return <Navigate to={routes.LOGIN} />;
  }

  if (!effectiveRoles.includes(user?.role)) {
    const defaultRoutes = {
      'SUPER_ADMIN': routes.SUPER_ADMIN,
      'ADMIN': routes.ADMIN,
      'DELIVERY_PARTNER': routes.DELIVERY,
      'B2B_CUSTOMER': routes.DASHBOARD,
      'B2C_CUSTOMER': routes.HOME,
      'VENDOR': routes.ADMIN
    };
    return <Navigate to={defaultRoutes[user?.role] || routes.HOME} />;
  }

  return children;
};

export default RoleGuard;