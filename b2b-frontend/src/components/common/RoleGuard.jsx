import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { routes } from '../../routes/routeConfig';

const RoleGuard = ({ children, allowedRoles, roles }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
  const effectiveRoles = roles || allowedRoles || [];

  if (loading) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="loader" style={{
        width: '40px',
        height: '40px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #1e40af',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Checking permissions...</p>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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