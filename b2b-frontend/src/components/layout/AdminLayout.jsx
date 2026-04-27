import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search,
  User,
  TrendingUp,
  Building2,
  Boxes,
  Warehouse,
  Tag
} from 'lucide-react';
import { routes } from '../../routes/routeConfig';
import { useAuth } from '../../modules/auth/hooks/useAuth';
import ConfirmDialog from '../feedback/ConfirmDialog';

const AdminLayout = ({ children, title = "Admin Panel" }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    setShowLogoutConfirm(false);
  }, [location.pathname]);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: routes.ADMIN },
    { icon: <Users size={20} />, label: "Users", path: routes.ADMIN_USERS },
    { icon: <Package size={20} />, label: "Orders", path: routes.ADMIN_ORDERS },
    { icon: <Package size={20} />, label: "Products", path: routes.ADMIN_PRODUCTS },
    { icon: <ShieldCheck size={20} />, label: "Approvals", path: routes.ADMIN_APPROVALS },
    { icon: <TrendingUp size={20} />, label: "Analytics", path: routes.ADMIN_ANALYTICS },
    { icon: <Boxes size={20} />, label: "Inventory", path: routes.ADMIN_INVENTORY },
    { icon: <Warehouse size={20} />, label: "Warehouse", path: routes.ADMIN_WAREHOUSE },
    { icon: <Tag size={20} />, label: "Promotions", path: routes.ADMIN_PROMOTIONS },
  ];

  const handleLogout = () => {
    logout();
    navigate(routes.LOGIN);
  };

  return (
    <div className="admin-layout flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-black text-white transition-all duration-300 z-[100] flex flex-col ${
          isSidebarOpen ? 'w-[280px]' : 'w-[80px]'
        }`}
      >
        <div className="p-6 flex items-center gap-4 border-b border-white/10">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
            <ShieldCheck size={24} className="text-white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight leading-none">Mokshith</span>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Enterprise</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={index} 
                to={item.path}
                className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 relative group ${
                  isActive 
                    ? 'text-white bg-white/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 shadow-[4px_0_12px_rgba(37,99,235,0.5)]"></div>
                )}
                <div className={`${isActive ? 'text-blue-500' : 'group-hover:text-blue-400'} transition-colors`}>
                  {item.icon}
                </div>
                {isSidebarOpen && (
                  <span className={`font-bold tracking-wide ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-black uppercase tracking-widest text-xs">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'
        }`}
      >
        {/* Header */}
        <header className="h-[80px] bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-all active:scale-90 text-gray-900"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
          </div>

          <div className="flex items-center gap-8">
            <div className="relative group hidden md:block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-12 pr-6 py-3 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all w-[300px] text-sm font-medium"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-3 hover:bg-gray-100 rounded-2xl transition-all relative text-gray-600">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-bold text-white">3</span>
              </button>
              
              <div className="h-8 w-px bg-gray-100 mx-2"></div>
              
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-gray-900 leading-none">{user?.name || 'Admin'}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{user?.role}</p>
                </div>
                <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                  {user?.name?.[0] || 'A'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          title="Sign Out"
          message="You are about to end your current session. Are you sure you want to continue?"
          confirmText="Sign Out"
        />
      )}
    </div>
  );
};

export default AdminLayout;