import { useEffect, useState, useCallback } from "react";
import { useOrder } from "../../order/hooks/useOrder";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import OrderStatusBadge from "../../order/components/OrderStatusBadge";
import { orderService } from "../../order/services/orderService";
import { 
  Package, 
  Search, 
  Filter, 
  RefreshCcw, 
  Calendar, 
  User as UserIcon, 
  CreditCard, 
  ArrowRight,
  ChevronRight,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  ClipboardList
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState({});
  const navigate = useNavigate();

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getOrders();
      const data = response.data || response;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (isUpdating[orderId]) return;
    
    try {
      setIsUpdating(prev => ({ ...prev, [orderId]: true }));
      await orderService.updateOrderStatus(orderId, newStatus);
      await fetchAllOrders();
    } catch (err) {
      alert(err.message || "Failed to update status");
    } finally {
      setIsUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock size={16} />;
      case 'CONFIRMED': return <CheckCircle2 size={16} />;
      case 'PROCESSING': return <RefreshCcw size={16} className="animate-spin-slow" />;
      case 'PACKED': return <PackageCheck size={16} />;
      case 'OUT_FOR_DELIVERY': return <Truck size={16} />;
      case 'DELIVERED': return <CheckCircle2 size={16} />;
      case 'CANCELLED': return <XCircle size={16} />;
      default: return <ClipboardList size={16} />;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-8 bg-gray-50/50 min-h-screen space-y-8">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-6 w-96 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-[2rem] shadow-sm animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ClipboardList size={40} className="text-blue-600" />
            Order <span className="text-blue-600">Management</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            Monitor and fulfill business transactions across the platform
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={fetchAllOrders}
            className="h-14 px-6 rounded-2xl flex items-center gap-2 font-black border-2 border-gray-100 hover:bg-gray-50 transition-all"
          >
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
            Refresh List
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-red-100 bg-red-50/50 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-red-600 font-black">
            <XCircle size={20} />
            {error}
          </div>
        </Card>
      )}

      <div className="grid gap-6">
        {orders.length > 0 ? (
          orders.map((order) => (
            <Card 
              key={order._id} 
              className="p-8 rounded-[2.5rem] border-none shadow-sm bg-white border border-gray-50 hover:shadow-xl transition-all duration-500 group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Column 1: Order Identity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg">
                      #{order._id?.slice(-6).toUpperCase()}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-gray-900 font-black mb-1">
                      <UserIcon size={16} className="text-blue-500" />
                      {order.userId?.name || 'Anonymous Business'}
                    </div>
                    <p className="text-xs font-bold text-gray-400 truncate">{order.userId?.email}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">{order.userId?.phone || 'No phone'}</p>
                  </div>
                </div>

                {/* Column 2: Items Summary */}
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Package size={14} />
                    Inventory Items
                  </p>
                  <div className="space-y-3">
                    {Array.isArray(order.items) && order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center group/item">
                        <span className="text-sm font-bold text-gray-600 truncate mr-2">{item.name}</span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100">
                        + {order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 3: Financial Details */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CreditCard size={14} />
                    Financial Info
                  </p>
                  <div>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">₹{order.totalAmount?.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {order.paymentMethod}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${
                        order.paymentStatus === 'PAID' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-rose-50 text-rose-600'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 4: Controls */}
                <div className="flex flex-col justify-between items-end gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Calendar size={14} />
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  
                  <div className="w-full relative group/select">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 z-10">
                      {getStatusIcon(order.status)}
                    </div>
                    <select 
                      disabled={isUpdating[order._id]}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-gray-100 bg-white text-sm font-black text-gray-700 appearance-none focus:border-blue-500 focus:ring-0 transition-all cursor-pointer disabled:opacity-50"
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                    >
                      <option value="PENDING">Pending Approval</option>
                      <option value="CONFIRMED">Confirm Order</option>
                      <option value="PROCESSING">Start Processing</option>
                      <option value="PACKED">Ready for Pickup</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Mark Delivered</option>
                      <option value="CANCELLED">Cancel Order</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-blue-500 transition-colors">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-2 border-gray-100 text-gray-500 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 font-black text-xs flex items-center justify-center gap-2 transition-all"
                    onClick={() => navigate(`${routes.ORDERS}/${order._id}`)}
                  >
                    View Details
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="max-w-2xl mx-auto mt-20">
            <Card className="text-center py-24 border-2 border-dashed border-gray-200 bg-white/50 rounded-[3rem]">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <ClipboardList size={64} className="text-gray-300" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No Active Orders</h2>
              <p className="text-gray-500 font-bold max-w-sm mx-auto text-lg leading-relaxed">
                We couldn't find any orders matching your criteria. Try refreshing the list or check back later.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
