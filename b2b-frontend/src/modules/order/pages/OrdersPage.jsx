import { useEffect, useState } from "react";
import { useOrder } from "../hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";
import { ORDER_STATUS } from "../../../utils/constants";
import { useSocket } from "../../../context/SocketContext";
import { useNotification } from "../../../context/NotificationContext";
import { 
  Package, 
  ChevronRight, 
  FileText, 
  RefreshCcw, 
  Calendar, 
  Clock, 
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  History
} from "lucide-react";
import { orderService } from "../services/orderService";

const OrdersPage = () => {
  const { orders, loading, error, fetchOrders, addToCart } = useOrder(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { on } = useSocket();
  const { showToast } = useNotification();
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    // 📡 Real-time Updates: Payment Success
    const offPayment = on('payment:success', (data) => {
      showToast(`Order #${data.orderId} paid successfully!`, 'success');
      if (fetchOrders) fetchOrders();
    });

    // 🚚 Real-time Updates: Delivery Assigned
    const offDelivery = on('delivery:assigned', (data) => {
      showToast(`Delivery agent assigned for Order #${data.orderId}`, 'info');
      if (fetchOrders) fetchOrders();
    });

    return () => {
      if (offPayment) offPayment();
      if (offDelivery) offDelivery();
    };
  }, [on, showToast, fetchOrders]);

  const handleDownloadInvoice = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId + '_invoice']: true }));
    try {
      await orderService.downloadInvoice(orderId);
      showToast("Invoice downloaded successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId + '_invoice']: false }));
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    
    order.items.forEach(item => {
      addToCart({
        ...item,
        id: item.productId || item.id || item._id
      });
    });
    
    showToast(`${order.items.length} items added to cart`, "success");
    navigate(routes.CART || '/cart');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium">Loading your business orders...</p>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <History size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Couldn't load orders</h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button onClick={() => fetchOrders()} className="w-full">Try Again</Button>
      </Card>
    </div>
  );

  const filteredOrders = Array.isArray(orders) ? orders.filter(order => order.status !== ORDER_STATUS.FAILED) : [];

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Order Management</h1>
            <p className="text-gray-500 font-medium">View history, download invoices, and manage your inventory purchases.</p>
          </div>
          <Button 
            onClick={() => navigate(routes.PRODUCTS)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all"
          >
            <ShoppingBag size={20} />
            New Purchase
          </Button>
        </div>

        {filteredOrders.length === 0 ? (
          <Card className="text-center py-20 bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem]">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={48} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders found</h2>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">You haven't placed any business orders yet. Start building your inventory.</p>
            <Button onClick={() => navigate(routes.PRODUCTS)} variant="primary" className="px-8">
              Explore Products
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card 
                key={order._id || order.id} 
                className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-[2rem] bg-white"
              >
                {/* Order Header */}
                <div className="p-6 md:p-8 border-b border-gray-50 bg-gray-50/30">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-gray-100">
                          #{ (order._id || order.id)?.slice(-8).toUpperCase() }
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="md:text-right flex flex-row md:flex-col justify-between items-center md:items-end gap-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Investment</p>
                      <p className="text-2xl font-black text-blue-600 tracking-tight">
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-6 md:p-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 group hover:bg-white hover:border-blue-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                              <Package size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{item.name}</p>
                              <p className="text-xs font-medium text-gray-400">Qty: {item.quantity} units</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-gray-700">₹{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-12 rounded-xl border-gray-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50"
                      onClick={() => navigate(`${routes.ORDERS}/${order._id || order.id}`)}
                    >
                      Details
                      <ExternalLink size={16} />
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      onClick={() => handleDownloadInvoice(order._id || order.id)}
                      disabled={actionLoading[(order._id || order.id) + '_invoice']}
                    >
                      <FileText size={16} />
                      {actionLoading[(order._id || order.id) + '_invoice'] ? 'Generating...' : 'Invoice'}
                    </Button>
                    <Button 
                      className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                      onClick={() => handleReorder(order)}
                    >
                      <RefreshCcw size={16} />
                      Reorder
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
