import React, { useState } from 'react';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { useOrder } from '../../modules/order/hooks/useOrder';
import { useNavigate, Link } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import Sidebar from './Sidebar';
import CartDrawer from './CartDrawer';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart, updateQuantity, removeFromCart } = useOrder();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <header style={{ 
        backgroundColor: 'var(--surface)', 
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to={routes.DASHBOARD} style={{ textDecoration: 'none' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>Mokshith B2B</h1>
        </Link>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to={routes.DASHBOARD} style={{ fontWeight: '600', color: 'var(--text-main)', textDecoration: 'none' }}>Home</Link>
            <Link to={routes.ORDERS} style={{ fontWeight: '600', color: 'var(--text-muted)', textDecoration: 'none' }}>Orders</Link>
            <Link to={routes.CREDIT} style={{ fontWeight: '600', color: 'var(--text-muted)', textDecoration: 'none' }}>Credit</Link>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div 
              onClick={() => setIsCartOpen(true)}
              style={{ position: 'relative', cursor: 'pointer', padding: '0.5rem', fontSize: '1.25rem' }}
            >
              🛒 <span style={{ 
                position: 'absolute', top: 0, right: 0, 
                backgroundColor: 'var(--error)', color: 'white', 
                fontSize: '0.65rem', borderRadius: '50%', 
                width: '18px', height: '18px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700'
              }}>
                {cartCount}
              </span>
            </div>
            
            <div 
              onClick={() => setIsSidebarOpen(true)}
              style={{ 
                width: '36px', height: '32px', borderRadius: '50%', 
                backgroundColor: 'var(--primary-light)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: '700', color: 'var(--primary)', 
                cursor: 'pointer',
                border: '2px solid var(--primary-light)'
              }}
            >
              {user?.name?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onLogout={logout} 
      />

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
