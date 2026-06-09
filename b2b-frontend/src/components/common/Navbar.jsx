import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/hooks/useAuth.js';
import { useOrder } from '../../modules/order/hooks/useOrder.js';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/routeConfig.js';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Package, CreditCard, MapPin, ChevronDown } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import CartDrawer from './CartDrawer.jsx';
import ConfirmDialog from '../feedback/ConfirmDialog.jsx';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cart, updateQuantity, removeFromCart } = useOrder();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // LOCATION STATE
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    return localStorage.getItem('mokshith_location') || 'Bangalore, Karnataka, India';
  });
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [manualLocation, setManualLocation] = useState('');

  const cartCount = cart?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const isLandingPage = location.pathname === routes.LANDING;

  useEffect(() => {
    const handleOpenPicker = () => setShowLocationPicker(true);
    window.addEventListener('openLocationPicker', handleOpenPicker);
    return () => window.removeEventListener('openLocationPicker', handleOpenPicker);
  }, []);

  const updateLocation = (loc) => {
    setDeliveryLocation(loc);
    localStorage.setItem('mokshith_location', loc);
    window.dispatchEvent(new CustomEvent('locationUpdated'));
  };

  // GEOLOCATION LOGIC
  const handleLocationClick = () => {
    setShowLocationPicker(true);
  };

  const getBrowserLocation = () => {
    if (isLocating) return;
    
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          const address = data.address;
          const city = address.city || address.town || address.village || address.suburb || 'Bangalore';
          const state = address.state || 'Karnataka';
          const country = address.country || 'India';
          const displayLoc = `${city}, ${state}, ${country}`;
          
          updateLocation(displayLoc);
          setShowLocationPicker(false);
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        alert("Please enable location permissions in your browser settings.");
        setIsLocating(false);
      }
    );
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualLocation.trim()) {
      updateLocation(manualLocation);
      setShowLocationPicker(false);
      setManualLocation('');
    }
  };

  return (
    <>
      <header className="h-[70px] bg-white border-b border-slate-100 sticky top-0 z-[100]">
        <div className="max-w-[1600px] h-full mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* LEFT: LOGO & LOCATION */}
          <div className="flex items-center gap-10">
            <Link to={routes.LANDING} className="flex items-center gap-2 shrink-0">
              <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">Mokshith</span>
              <span className="px-1.5 py-0.5 bg-sky-600 text-white text-[8px] md:text-[10px] font-black rounded uppercase">B2B</span>
            </Link>

            <div 
              onClick={handleLocationClick}
              className={`hidden lg:flex items-center gap-2 border-l border-slate-100 pl-8 max-w-[280px] cursor-pointer group transition-opacity ${isLocating ? 'opacity-50' : 'opacity-100'}`}
            >
              <MapPin size={18} className="text-slate-900 shrink-0 group-hover:text-sky-600 transition-colors" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black text-slate-900 leading-none group-hover:text-sky-600 transition-colors">
                    {isLocating ? 'Locating...' : 'Deliver to'}
                  </span>
                  <ChevronDown size={12} className="text-slate-400 group-hover:translate-y-0.5 transition-transform" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate mt-1">
                  {deliveryLocation}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: NAVIGATION */}
          <nav className="hidden xl:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            <Link to={routes.PRODUCTS} className={`text-[13px] font-black uppercase tracking-widest transition-all pb-1 border-b-2 ${location.pathname === routes.PRODUCTS ? 'text-sky-600 border-sky-600' : 'text-slate-500 border-transparent hover:text-slate-900'}`}>
              Products
            </Link>
            {user && (
              <>
                <Link to={routes.DASHBOARD} className={`text-[13px] font-black uppercase tracking-widest transition-all pb-1 border-b-2 ${location.pathname === routes.DASHBOARD ? 'text-sky-600 border-sky-600' : 'text-slate-500 border-transparent hover:text-slate-900'}`}>
                  Dashboard
                </Link>
                <Link to={routes.ORDERS} className={`text-[13px] font-black uppercase tracking-widest transition-all pb-1 border-b-2 ${location.pathname === routes.ORDERS ? 'text-sky-600 border-sky-600' : 'text-slate-500 border-transparent hover:text-slate-900'}`}>
                  Orders
                </Link>
              </>
            )}
          </nav>

          {/* RIGHT: CART & USER */}
          <div className="flex items-center gap-3 md:gap-5">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2.5 text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all relative group"
            >
              <div className="relative">
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 bg-sky-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                    {cartCount}
                  </span>
                )}
              </div>
            </button>
            
            {user ? (
              <div className="flex items-center gap-3 md:gap-4 pl-3 md:pl-5 border-l border-slate-100">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-sky-900/20 border-2 border-white transition-all hover:scale-105 active:scale-95"
                >
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </button>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                >
                  <Menu size={24} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 md:gap-6">
                <Link to={routes.LOGIN} className="hidden sm:block text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">
                  Login
                </Link>
                <Link to={routes.REGISTER} className="px-6 py-2.5 bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-sky-900/20 hover:bg-sky-700 transition-all active:scale-95">
                  Join
                </Link>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                >
                  <Menu size={24} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PORTALS */}
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

      {/* LOCATION PICKER MODAL */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowLocationPicker(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mb-6">
              <MapPin size={32} className="text-sky-600" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Select Location</h2>
            <p className="text-slate-500 font-medium mb-8 text-sm">
              Please provide your delivery location to see products available in your area.
            </p>

            <div className="space-y-6">
              <button 
                onClick={getBrowserLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-sky-200 uppercase tracking-widest text-xs"
              >
                {isLocating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Locating...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Use Current Location
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <span className="relative px-4 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">or search manually</span>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input 
                  type="text"
                  placeholder="Enter city, state or area..."
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!manualLocation.trim()}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Location
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
