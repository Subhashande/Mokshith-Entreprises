import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { useOrder } from '../../modules/order/hooks/useOrder';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Package, CreditCard } from 'lucide-react';
import Sidebar from './Sidebar';
import CartDrawer from './CartDrawer';
import ConfirmDialog from '../feedback/ConfirmDialog';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart, updateQuantity, removeFromCart } = useOrder();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const isLandingPage = location.pathname === routes.LANDING;

  const handleLogout = () => {
    logout();
    navigate(routes.LANDING);
  };

  return (
    <>
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
            {!user && (
              <Link to="#" className={styles.navLink}>
                Pricing
              </Link>
            )}
            {user && (
              <>
                <Link to={routes.DASHBOARD} className={`${styles.navLink} ${location.pathname === routes.DASHBOARD ? styles.active : ''}`}>
                  Dashboard
                </Link>
                <Link to={routes.ORDERS} className={`${styles.navLink} ${location.pathname === routes.ORDERS ? styles.active : ''}`}>
                  Orders
                </Link>
              </>
            )}
          </nav>

          <div className={styles.navbarActions}>
            <button 
              onClick={() => setIsCartOpen(true)}
              className={styles.actionIconButton}
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </button>
            
            {user ? (
              <div className={styles.userProfileWrapper}>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className={styles.userAvatarButton}
                >
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </button>
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Link to={routes.LOGIN} className={styles.loginLink}>
                  Login
                </Link>
                <Link to={routes.REGISTER} className={`btn-primary ${styles.registerCta}`}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onLogout={() => setShowLogoutConfirm(true)} 
      />

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

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart} 
        onUpdateQuantity={updateQuantity} 
        onRemoveItem={removeFromCart} 
      />
    </>
  );
};

export default Navbar;
