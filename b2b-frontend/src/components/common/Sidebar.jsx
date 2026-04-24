import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import { 
  User, 
  Package, 
  CreditCard, 
  Settings, 
  Shield, 
  HelpCircle, 
  LogOut, 
  X,
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Boxes,
  Warehouse,
  Tag,
  Truck,
  Heart,
  History,
  Settings as SettingsIcon,
  Package as PackageIcon,
  MapPin
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, user, onLogout }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const adminLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: routes.ADMIN },
    { icon: <BarChart3 size={18} />, label: "Analytics", path: routes.ADMIN_ANALYTICS },
    { icon: <Users size={18} />, label: "Manage Users", path: routes.ADMIN_USERS },
    { icon: <PackageIcon size={18} />, label: "Products", path: routes.ADMIN_PRODUCTS },
    { icon: <PackageIcon size={18} />, label: "Orders", path: routes.ADMIN_ORDERS },
    { icon: <Building2 size={18} />, label: "Vendors", path: routes.ADMIN_VENDORS },
    { icon: <Boxes size={18} />, label: "Inventory", path: routes.ADMIN_INVENTORY },
    { icon: <Warehouse size={18} />, label: "Warehouse", path: routes.ADMIN_WAREHOUSE },
    { icon: <Tag size={18} />, label: "Promotions", path: routes.ADMIN_PROMOTIONS },
    { icon: <SettingsIcon size={18} />, label: "Settings", path: routes.ADMIN_SETTINGS },
  ];

  const vendorLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: routes.ADMIN },
    { icon: <Building2 size={18} />, label: "Company Profile", path: routes.VENDOR_COMPANY },
    { icon: <Boxes size={18} />, label: "Inventory", path: routes.VENDOR_INVENTORY },
    { icon: <PackageIcon size={18} />, label: "Orders", path: routes.ADMIN_ORDERS },
    { icon: <SettingsIcon size={18} />, label: "Settings", path: routes.ADMIN_SETTINGS },
  ];

  const deliveryLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Logistics Dashboard", path: routes.DELIVERY_DASHBOARD },
    { icon: <Truck size={18} />, label: "My Shipments", path: routes.DELIVERY_SHIPMENTS },
    { icon: <History size={18} />, label: "History", path: routes.DELIVERY_HISTORY },
  ];

  const b2bCustomerLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: routes.DASHBOARD },
    { icon: <User size={18} />, label: "My Profile", path: routes.PROFILE },
    { icon: <PackageIcon size={18} />, label: "My Orders", path: routes.ORDERS },
    { icon: <Heart size={18} />, label: "Wishlist", path: routes.WISHLIST },
    { icon: <CreditCard size={18} />, label: "Credit Balance", path: routes.CREDIT },
    { icon: <Shield size={18} />, label: "Security", path: routes.SECURITY },
    { icon: <HelpCircle size={18} />, label: "Help & Support", path: routes.HELP },
  ];

  const b2cCustomerLinks = [
    { icon: <LayoutDashboard size={18} />, label: "Home", path: routes.HOME },
    { icon: <User size={18} />, label: "My Profile", path: routes.PROFILE },
    { icon: <PackageIcon size={18} />, label: "My Orders", path: routes.ORDERS },
    { icon: <Heart size={18} />, label: "Wishlist", path: routes.WISHLIST },
    { icon: <Shield size={18} />, label: "Security", path: routes.SECURITY },
    { icon: <HelpCircle size={18} />, label: "Help & Support", path: routes.HELP },
  ];

  const getLinksByRole = () => {
    switch (user?.role) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return adminLinks;
      case "VENDOR":
        return vendorLinks;
      case "DELIVERY_PARTNER":
        return deliveryLinks;
      case "B2B_CUSTOMER":
        return b2bCustomerLinks;
      case "B2C_CUSTOMER":
        return b2cCustomerLinks;
      default:
        return b2cCustomerLinks;
    }
  };

  const links = getLinksByRole();

  return (
    <div 
      className={`fixed inset-0 z-[1000] flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Drawer */}
      <div 
        className={`relative w-[320px] h-full bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-gray-900 tracking-tight">Mokshith</span>
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md tracking-widest uppercase">B2B</span>
          </div>
          <button 
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-8 flex items-center gap-5 bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-200 overflow-hidden shrink-0">
            {user?.profileImage ? (
              <img 
                src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.profileImage}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-gray-900 truncate leading-tight">{user?.name}</h3>
            <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
            <span className="px-2.5 py-1 bg-white border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-lg">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-8 px-4 custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Navigation</p>
            {links.map((link, index) => (
              <button 
                key={index}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                onClick={() => { navigate(link.path); onClose(); }}
              >
                <span className="group-hover:scale-110 transition-transform">{link.icon}</span>
                <span className="font-bold tracking-tight text-sm">{link.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button 
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-50 text-red-600 font-black text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all group" 
            onClick={onLogout}
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;