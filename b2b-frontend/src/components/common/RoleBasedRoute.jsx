import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { routes } from '../../routes/routeConfig';

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to={routes.LOGIN} />;
  }

  if (!allowedRoles.includes(user?.role)) {
    // Redirect to a default page based on their role if they try to access unauthorized area
    switch (user?.role) {
      case "SUPER_ADMIN": return <Navigate to={routes.SUPER_ADMIN} />;
      case "ADMIN": return <Navigate to={routes.ADMIN} />;
      case "DELIVERY": return <Navigate to={routes.DELIVERY} />;
      case "VENDOR": return <Navigate to={routes.DASHBOARD} />;
      case "USER": return <Navigate to={routes.HOME} />;
      default: return <Navigate to={routes.PRODUCTS} />;
    }
  }

  return children;
};

export default RoleBasedRoute;
