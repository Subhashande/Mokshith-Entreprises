import React, { useState } from 'react';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { useOrder } from '../../modules/order/hooks/useOrder';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Package, CreditCard } from 'lucide-react';
import Sidebar from './Sidebar';
import CartDrawer from './CartDrawer';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart, updateQuantity, removeFromCart } = useOrder();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const isLandingPage = location.pathname === routes.LANDING;

  const handleLogout = () => {
    logout();
    navigate(routes.LANDING);
  };

  return (
    <>
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
            {!user && (
              <Link to="#" className="nav-link">
                Pricing
              </Link>
            )}
            {user && (
              <>
                <Link to={routes.DASHBOARD} className={`nav-link ${location.pathname === routes.DASHBOARD ? 'active' : ''}`}>
                  Dashboard
                </Link>
                <Link to={routes.ORDERS} className={`nav-link ${location.pathname === routes.ORDERS ? 'active' : ''}`}>
                  Orders
                </Link>
              </>
            )}
          </nav>

          <div className="navbar-actions">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="action-icon-button"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            
            {user ? (
              <div className="user-profile-wrapper">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="user-avatar-button"
                >
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to={routes.LOGIN} className="login-link">
                  Login
                </Link>
                <Link to={routes.REGISTER} className="premium-button premium-button-primary register-cta">
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
        onLogout={handleLogout} 
      />

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart} 
        onUpdateQuantity={updateQuantity} 
        onRemoveItem={removeFromCart} 
      />

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

        .action-icon-button {
          position: relative;
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 0.5rem;
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-icon-button:hover {
          color: var(--primary);
        }

        .cart-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: var(--primary);
          color: white;
          font-size: 0.7rem;
          border-radius: 9999px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          padding: 0 4px;
        }

        .user-avatar-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--primary);
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .user-avatar-button:hover {
          box-shadow: 0 0 0 4px var(--primary-light);
        }

        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .login-link {
          color: var(--text-main);
          font-weight: 600;
          font-size: 0.9375rem;
          text-decoration: none;
        }

        .register-cta {
          padding: 0.625rem 1.25rem;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .navbar-links {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
