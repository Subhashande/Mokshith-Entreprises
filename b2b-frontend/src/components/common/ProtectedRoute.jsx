import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { routes } from '../../routes/routeConfig';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, loading: authLoading } = useSelector((state) => state.auth);
  const { config } = useSelector((state) => state.superAdmin);

  const token = localStorage.getItem('token');
  const hasValidToken = !!token;

  if (authLoading) return <div>Authenticating...</div>;

  if (!isAuthenticated || !hasValidToken) {
    return <Navigate to={routes.LOGIN} />;
  }

  if (config?.maintenanceMode && user?.role !== "SUPER_ADMIN") {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>System Under Maintenance</h2>
        <p style={{ color: 'var(--text-muted)' }}>We are performing scheduled maintenance. Please try again later.</p>
        <button
          onClick={() => window.location.href = "/login"}
          style={{ marginTop: '2rem', padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: '700' }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
