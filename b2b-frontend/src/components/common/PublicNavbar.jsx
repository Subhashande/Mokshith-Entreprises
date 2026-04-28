import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import styles from './PublicNavbar.module.css';

const PublicNavbar = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <header className={styles.navbarHeader}>
      <div className={styles.navbarContainer}>
        <Link to={routes.LANDING} className={styles.navbarLogo}>
          <span className={styles.logoText}>Mokshith</span>
          <span className={styles.logoBadge}>B2B</span>
        </Link>

        <nav className={styles.navbarLinks}>
          <Link to={routes.PRODUCTS} className={`${styles.navLink} ${location.pathname === routes.PRODUCTS ? styles.active : ''}`}>
            Products
          </Link>
          <Link to="#" className={styles.navLink}>
            Pricing
          </Link>
          <Link to="#" className={styles.navLink}>
            Solutions
          </Link>
        </nav>

        <div className={styles.navbarActions}>
          {user ? (
            <div className={styles.authButtons}>
              <Link to={routes.DASHBOARD} className={styles.loginLink}>
                Dashboard
              </Link>
              <Link to={routes.PRODUCTS} className={`btn-primary ${styles.registerCta}`}>
                Shop Now
              </Link>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link to={routes.LOGIN} className={styles.loginLink}>
                Login
              </Link>
              <Link to={routes.REGISTER} className={`btn-primary ${styles.registerCta}`}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicNavbar;
