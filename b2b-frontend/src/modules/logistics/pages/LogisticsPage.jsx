import React from 'react';
import { useLogistics } from '../hooks/useLogistics';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  Navigation, 
  Package,
  ArrowRight,
  History
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statuses = {
    'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    'ACCEPTED': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accepted' },
    'OUT_FOR_DELIVERY': { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Out for Delivery' },
    'DELIVERED': { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered' },
    'CANCELLED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' }
  };
  const { bg, text, label } = statuses[status] || statuses['PENDING'];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

const LogisticsPage = () => {
  const { 
    deliveryQueue, 
    history, 
    loading, 
    error, 
    acceptDelivery, 
    startDelivery, 
    markDelivered 
  } = useLogistics();

  const safeQueue = Array.isArray(deliveryQueue) ? deliveryQueue : [];

  const handleOpenMap = (address) => {
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  if (loading && !safeQueue.length) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your deliveries and track shipments</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex items-center gap-2">
            <History size={16} />
            History
          </Button>
          <Button className="flex items-center gap-2">
            <Truck size={16} />
            Available Tasks
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Active Delivery Queue
          </h2>
          
          <div className="space-y-4">
            {safeQueue.length === 0 ? (
              <Card className="text-center py-12">
                <Truck size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No active deliveries</h3>
                <p className="text-gray-500">Your delivery queue is currently empty.</p>
              </Card>
            ) : (
              safeQueue.map((delivery) => (
                <Card key={delivery._id} className="hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package size={18} className="text-gray-400" />
                          <span className="font-bold text-gray-900">Order #{delivery.orderId?.slice(-6).toUpperCase()}</span>
                        </div>
                        <StatusBadge status={delivery.status} />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin size={18} className="text-red-500 mt-1 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                            <p className="text-sm text-gray-600">
                              {typeof delivery.shippingAddress === 'object' 
                                ? `${delivery.shippingAddress.street || ''} ${delivery.shippingAddress.city || ''}, ${delivery.shippingAddress.state || ''}`.trim() || 'N/A'
                                : delivery.shippingAddress || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Phone size={18} className="text-green-500 shrink-0" />
                          <p className="text-sm text-gray-600">{delivery.customerPhone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                      <Button 
                        variant="secondary" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => handleOpenMap(delivery.shippingAddress)}
                      >
                        <Navigation size={16} />
                        Open in Maps
                      </Button>
                      
                      {delivery.status === 'PENDING' && (
                        <Button 
                          className="w-full"
                          onClick={() => acceptDelivery(delivery._id)}
                        >
                          Accept Delivery
                        </Button>
                      )}
                      
                      {delivery.status === 'ACCEPTED' && (
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => startDelivery(delivery._id)}
                        >
                          Start Delivery
                        </Button>
                      )}
                      
                      {delivery.status === 'OUT_FOR_DELIVERY' && (
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => markDelivered(delivery._id)}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            Recent History
          </h2>
          <Card>
            <div className="space-y-4">
              {(() => {
                const safeHistory = Array.isArray(history) ? history : [];
                if (safeHistory.length === 0) {
                  return <p className="text-center text-gray-500 py-4">No recent history</p>;
                }
                return (
                  <>
                    {safeHistory.slice(0, 5).map((item) => (
                      <div key={item._id} className="flex items-center gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                          <CheckCircle size={20} className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">Order #{item.orderId?.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">{new Date(item.deliveredAt).toLocaleDateString()}</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-300" />
                      </div>
                    ))}
                    {safeHistory.length > 5 && (
                      <Button variant="secondary" className="w-full text-sm">View All History</Button>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>

          <Card className="mt-6 bg-blue-600 text-white border-0">
            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">Contact dispatch if you encounter any issues during delivery.</p>
            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 border-0">
              Call Support
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPage;