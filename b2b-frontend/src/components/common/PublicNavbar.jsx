import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { useAuth } from '../../modules/auth/hooks/useAuth';

const PublicNavbar = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to={routes.LANDING} className="navbar-logo">
          <span className="logo-text">Mokshith</span>
          <span className="logo-badge">B2B</span>
        </Link>

        <nav className="navbar-links">
          <Link to={routes.PRODUCTS} className={`nav-link ${location.pathname === routes.PRODUCTS ? 'active' : ''}`}>
            Products
          </Link>
          <Link to="#" className="nav-link">
            Pricing
          </Link>
          <Link to="#" className="nav-link">
            Solutions
          </Link>
        </nav>

        <div className="navbar-actions">
          {user ? (
            <div className="auth-buttons">
              <Link to={routes.DASHBOARD} className="login-link">
                Dashboard
              </Link>
              <Link to={routes.PRODUCTS} className="premium-button premium-button-primary register-cta">
                Shop Now
              </Link>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to={routes.LOGIN} className="login-link">
                Login
              </Link>
              <Link to={routes.REGISTER} className="premium-button premium-button-primary register-cta">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar-header {
          background-color: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          height: 72px;
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
        }

        .navbar-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: #000000;
          letter-spacing: -0.02em;
        }

        .logo-badge {
          background-color: var(--primary);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .navbar-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-link {
          font-weight: 500;
          color: #4b5563;
          text-decoration: none;
          font-size: 0.9375rem;
          transition: var(--transition-fast);
        }

        .nav-link:hover, .nav-link.active {
          color: var(--primary);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .login-link {
          text-decoration: none;
          color: var(--text);
          font-weight: 600;
          margin-right: 1.5rem;
        }

        .register-cta {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          text-decoration: none;
        }
      `}</style>
    </header>
  );
};

export default PublicNavbar;
