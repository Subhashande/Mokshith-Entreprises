import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useShipment } from '../hooks/useShipment';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { 
  Package, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Navigation,
  ArrowLeft
} from 'lucide-react';

const TrackingStep = ({ title, date, status, isCompleted, isCurrent, isLast }) => (
  <div className="relative flex items-start gap-4 pb-8 group last:pb-0">
    {!isLast && (
      <div className={`absolute left-4 top-10 w-0.5 h-full -ml-px ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}></div>
    )}
    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
      isCompleted ? 'bg-green-100 text-green-600' : 
      isCurrent ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-50' : 
      'bg-gray-100 text-gray-400'
    }`}>
      {isCompleted ? <CheckCircle2 size={18} /> : 
       isCurrent ? <Truck size={18} /> : 
       <Clock size={18} />}
    </div>
    <div className="flex-1 min-w-0 pt-1">
      <div className="flex items-center justify-between gap-4">
        <h4 className={`text-sm font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-900'}`}>{title}</h4>
        <span className="text-xs text-gray-500">{date || 'Scheduled'}</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">{status}</p>
    </div>
  </div>
);

const ShipmentTrackingPage = () => {
  const { id } = useParams();
  const { shipment, loading, error } = useShipment(id);

  if (loading && !shipment) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipment not found</h3>
          <p className="text-gray-500 mb-6">{error || "The shipment you're looking for doesn't exist or you don't have access."}</p>
          <Link to="/orders">
            <Button variant="secondary" className="flex items-center gap-2 mx-auto">
              <ArrowLeft size={16} />
              Back to Orders
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const steps = [
    { title: 'Order Placed', status: 'Your order has been successfully placed.', date: shipment.orderDate, key: 'PLACED' },
    { title: 'Packed', status: 'The vendor has packed your items.', date: shipment.packedDate, key: 'PACKED' },
    { title: 'Shipped', status: 'Your shipment is on the way.', date: shipment.shippedDate, key: 'SHIPPED' },
    { title: 'Out for Delivery', status: 'The delivery agent is arriving soon.', date: shipment.outForDeliveryDate, key: 'OUT_FOR_DELIVERY' },
    { title: 'Delivered', status: 'Shipment has been delivered successfully.', date: shipment.deliveredDate, key: 'DELIVERED' }
  ];

  const currentStatusIndex = steps.findIndex(step => step.key === shipment.status);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/orders" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Shipment</h1>
            <p className="text-gray-500 mt-1">Shipment ID: #{shipment._id?.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex items-center gap-2">
            <Navigation size={16} />
            Live Map
          </Button>
          <Button className="flex items-center gap-2">
            Contact Delivery
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Package size={32} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estimated Delivery</p>
                  <p className="text-xl font-bold text-gray-900">{shipment.estimatedDeliveryDate || 'Processing...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Truck size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Status</p>
                  <p className="text-xl font-bold text-gray-900 capitalize">{shipment.status?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-8">Delivery Progress</h3>
            <div className="max-w-xl mx-auto">
              {steps.map((step, index) => (
                <TrackingStep 
                  key={index}
                  title={step.title}
                  status={step.status}
                  date={step.date ? new Date(step.date).toLocaleString() : null}
                  isCompleted={index < currentStatusIndex || shipment.status === 'DELIVERED'}
                  isCurrent={index === currentStatusIndex && shipment.status !== 'DELIVERED'}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-red-500" />
              Delivery Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Shipping To</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{shipment.customerName}</p>
                <p className="text-sm text-gray-600 mt-1">{shipment.shippingAddress}</p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Carrier</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{shipment.carrierName || 'Mokshith Express'}</p>
                <p className="text-sm text-gray-600 mt-1">Tracking ID: {shipment.trackingId || 'N/A'}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900 text-white border-0">
            <h3 className="font-bold text-lg mb-4">Package Contents</h3>
            <div className="space-y-3">
              {shipment.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{item.name} x {item.quantity}</span>
                  <span className="font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-700 mt-3 flex justify-between font-bold">
                <span>Total Value</span>
                <span>₹{shipment.totalValue}</span>
              </div>
            </div>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              Need to reschedule? <button className="font-bold underline">Click here</button> to choose a different time slot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentTrackingPage;