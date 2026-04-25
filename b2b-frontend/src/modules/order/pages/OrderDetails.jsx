import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrder } from "../hooks/useOrder";
import { orderService } from "../services/orderService";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CreditCard, 
  Calendar, 
  FileText,
  MapPin,
  Clock,
  ExternalLink
} from "lucide-react";
import { useNotification } from "../../../context/NotificationContext";
import { routes } from "../../../routes/routeConfig";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrderById(id);
        setOrder(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch order details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrderDetails();
  }, [id]);

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      await orderService.downloadInvoice(id);
      showToast("Invoice downloaded successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50/50">
      <Card className="max-w-md w-full text-center p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h3>
        <p className="text-gray-500 mb-6">{error || "The order you're looking for doesn't exist."}</p>
        <Button onClick={() => navigate(routes.ORDERS)} className="w-full">Back to Orders</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Orders
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                Order #{order._id.slice(-8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-gray-500 font-medium">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="flex items-center gap-2 border-2"
          >
            <FileText size={18} />
            {downloading ? 'Downloading...' : 'Download Invoice'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <Card className="overflow-hidden border-none shadow-sm rounded-3xl bg-white">
              <div className="p-6 border-b border-gray-50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  Order Items
                </h3>
              </div>
              <div className="p-0">
                {order.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-6 flex items-center justify-between ${
                      idx !== order.items.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 border border-gray-100">
                        <Package size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-sm font-medium text-gray-400">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-black text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Subtotal</span>
                    <span>₹{(order.totalAmount / 1.18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>GST (18%)</span>
                    <span>₹{(order.totalAmount - (order.totalAmount / 1.18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-gray-900 pt-3 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-blue-600">₹{order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tracking Info (If available) */}
            {order.shipmentId && (
              <Card className="p-6 border-none shadow-sm rounded-3xl bg-white">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Truck size={20} className="text-blue-600" />
                  Shipment Tracking
                </h3>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">Tracking ID</p>
                      <p className="text-xs font-medium text-blue-700">#{order.shipmentId.slice(-10).toUpperCase()}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:bg-blue-100 font-bold flex items-center gap-1"
                    onClick={() => navigate(`${routes.SHIPMENT_TRACKING.replace(':id', order.shipmentId)}`)}
                  >
                    Track <ExternalLink size={14} />
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Delivery Address */}
            <Card className="p-6 border-none shadow-sm rounded-3xl bg-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-blue-600" />
                Shipping To
              </h3>
              <div className="text-gray-600 font-medium leading-relaxed">
                <p className="text-gray-900 font-bold mb-1">{order.shippingAddress?.fullName || 'Business Address'}</p>
                <p>{order.shippingAddress?.addressLine1}</p>
                {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                <p>{order.shippingAddress?.pincode}</p>
                <p className="mt-2 text-gray-900">📞 {order.shippingAddress?.phone}</p>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6 border-none shadow-sm rounded-3xl bg-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CreditCard size={20} className="text-blue-600" />
                Payment Method
              </h3>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 shadow-sm border border-gray-100">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{order.paymentMethod}</p>
                  <p className="text-xs font-medium text-gray-500 capitalize">{order.paymentStatus?.toLowerCase()} status</p>
                </div>
              </div>
            </Card>

            {/* Help/Support */}
            <Card className="p-6 border-none shadow-sm rounded-3xl bg-blue-600 text-white">
              <h3 className="font-bold mb-2">Need help with this order?</h3>
              <p className="text-blue-100 text-sm mb-4">Contact our support team for any queries regarding delivery or returns.</p>
              <Button 
                onClick={() => navigate(routes.HELP)}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold"
              >
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
