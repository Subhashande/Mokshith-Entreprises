import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';
import ConfirmDialog from '../feedback/ConfirmDialog';
import { 
  Truck, 
  LogOut, 
  Package, 
  History, 
  LayoutDashboard,
  User,
  Bell,
  MapPin
} from 'lucide-react';

const DeliveryLayout = ({ children, title = "Delivery Portal" }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Logistics", path: routes.DELIVERY_DASHBOARD },
    { icon: <Package size={20} />, label: "Shipments", path: routes.DELIVERY_SHIPMENTS },
    { icon: <History size={20} />, label: "History", path: routes.DELIVERY_HISTORY },
  ];

  return (
    <div className="delivery-layout flex min-h-screen bg-gray-50/50">
      {/* Sidebar - Mobile friendly approach can be added later, for now consistent with Admin */}
      <aside className="w-[280px] bg-slate-900 text-white flex flex-col fixed h-full z-50 transition-all duration-300">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none">Logistics</h1>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1.5">Delivery Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-10 px-4 space-y-2">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={index} 
                to={item.path}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`${isActive ? 'text-white' : 'group-hover:text-emerald-400'} transition-colors`}>
                  {item.icon}
                </div>
                <span className="font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="font-black uppercase tracking-widest text-xs">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <header className="h-[90px] bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-40">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <button className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 relative">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-6 w-px bg-gray-100 mx-2"></div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900 leading-none">{user?.name}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Delivery Agent</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-lg shadow-inner">
                  {user?.name?.[0] || 'D'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-10 flex-1">
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          title="Sign Out"
          message="Are you sure you want to exit the delivery portal?"
          confirmText="Sign Out"
          variant="danger"
        />
      )}
    </div>
  );
};

export default DeliveryLayout;