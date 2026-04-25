import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import { useAuth } from "../../auth/hooks/useAuth";
import { routes } from "../../../routes/routeConfig";
import AdminStats from "../components/AdminStats";
import Button from "../../../components/ui/Button";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Building2, 
  Bell, 
  Plus,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  X
} from 'lucide-react';

const AdminPage = () => {
  const { approvals, stats, loading, error, approve, reject, fetchLogs } = useAdmin();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    { icon: <ShoppingCart size={20} />, label: "Orders", path: routes.ADMIN_ORDERS, color: "blue", count: stats?.totalOrders },
    { icon: <Package size={20} />, label: "Inventory", path: "/admin/inventory", color: "orange", count: "8 Low" },
    { icon: <Users size={20} />, label: "Customers", path: routes.ADMIN_USERS, color: "indigo", count: stats?.totalUsers },
    { icon: <Building2 size={20} />, label: "Warehouses", path: "/admin/warehouses", color: "emerald", count: "4 Active" },
    { icon: <TrendingUp size={20} />, label: "Analytics", path: routes.ADMIN_ANALYTICS, color: "purple", count: "Live" },
    { icon: <ShieldCheck size={20} />, label: "Approvals", path: routes.ADMIN_APPROVALS, color: "amber", count: approvals?.length },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs">Initializing Admin Console</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Control <span className="text-blue-600">Center</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            Welcome back, {user?.name}. Operational systems are stable.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
            <Bell size={20} />
          </button>
          <Button onClick={() => navigate(routes.ADMIN_PRODUCTS)} className="shadow-xl shadow-blue-200 h-14 px-8 text-lg rounded-2xl flex items-center gap-3">
            <Plus size={24} strokeWidth={3} />
            Add Product
          </Button>
        </div>
      </header>

      {/* Stats Section */}
      <AdminStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Quick Actions - 7 cols */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quick Operations</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <button 
                key={index} 
                onClick={() => navigate(action.path)}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group text-left relative overflow-hidden"
              >
                <div className={`p-4 rounded-2xl bg-${action.color}-50 text-${action.color}-600 mb-4 inline-block group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <h3 className="font-black text-gray-900 block">{action.label}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">{action.count || 'View All'}</span>
                <ArrowUpRight size={16} className="absolute top-6 right-6 text-gray-200 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Pending Approvals - 5 cols */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Verification Queue</h2>
            <Link to={routes.ADMIN_APPROVALS} className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline">View All Queue</Link>
          </div>
          <div className="space-y-4">
            {approvals?.length > 0 ? (
              approvals.slice(0, 4).map((approval, index) => (
                <div key={approval._id || index} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-amber-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-black">
                      {approval.title?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-tight">{approval.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{approval.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => approve(approval.id)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all">
                      <ShieldCheck size={16} />
                    </button>
                    <button onClick={() => reject(approval.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-gray-200" />
                </div>
                <h3 className="font-black text-gray-900">Queue is Empty</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">All verifications completed</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;