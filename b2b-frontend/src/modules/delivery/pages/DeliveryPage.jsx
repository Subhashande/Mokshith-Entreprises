import React, { useState } from 'react';
import { useDelivery } from '../hooks/useDelivery';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Package, 
  CheckCircle2, 
  Clock, 
  Navigation,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCcw,
  Calendar,
  DollarSign
} from 'lucide-react';

const DeliveryPage = () => {
  const { deliveries, loading, error, updateDeliveryStatus, fetchDeliveries } = useDelivery();
  const [isUpdating, setIsUpdating] = useState({});

  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const activeDeliveries = safeDeliveries.filter(d => d.status !== 'DELIVERED');
  const completedDeliveries = safeDeliveries.filter(d => d.status === 'DELIVERED');

  const activeCount = activeDeliveries.length;
  const completedToday = completedDeliveries.length;
  const earningsToday = completedToday * 50; // Simple simulation

  const handleOpenMaps = (address) => {
    if (!address) return;
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
  };

  const handleCallCustomer = (phone) => {
    if (!phone) return;
    window.open(`tel:${phone}`, '_self');
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      setIsUpdating(prev => ({ ...prev, [id]: true }));
      await updateDeliveryStatus(id, status);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading && safeDeliveries.length === 0) {
    return (
      <div className="p-8 bg-gray-50/50 min-h-screen flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600 animate-bounce">
          <Truck size={40} />
        </div>
        <p className="text-xl font-black text-gray-400 animate-pulse">Syncing delivery routes...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Delivery <span className="text-blue-600">Command</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button 
          onClick={fetchDeliveries} 
          disabled={loading}
          variant="secondary"
          className="h-14 px-8 rounded-2xl flex items-center gap-3 bg-white border-2 border-gray-100 shadow-sm font-black"
        >
          <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          {loading ? "Refreshing..." : "Refresh Queue"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <Card className="p-8 border-none bg-white hover:shadow-xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <Truck size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Active Tasks</span>
          </div>
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{activeCount}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Assigned Deliveries</p>
        </Card>

        <Card className="p-8 border-none bg-white hover:shadow-xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <CheckCircle2 size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Efficiency</span>
          </div>
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">{completedToday}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Completed Today</p>
        </Card>

        <Card className="p-8 border-none bg-white hover:shadow-xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 shadow-sm">
              <DollarSign size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Earnings</span>
          </div>
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">₹{earningsToday.toLocaleString()}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue Today</p>
        </Card>
      </div>

      {error && (
        <Card className="mb-10 bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-600">
          <div className="p-3 bg-rose-100 rounded-2xl shadow-inner">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-black text-lg">Connection Issue</h4>
            <p className="font-bold text-sm opacity-80">{error}</p>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <Calendar size={24} className="text-blue-500" />
          Today's Schedule
        </h2>

        {activeDeliveries.length === 0 && !loading ? (
          <Card className="text-center py-24 bg-white/50 border-2 border-dashed border-gray-200 rounded-[3rem]">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Queue Cleared!</h3>
            <p className="text-gray-500 font-bold max-w-sm mx-auto mb-10 text-lg leading-relaxed">
              No active deliveries assigned to you. New tasks will appear here automatically.
            </p>
            <Button onClick={fetchDeliveries} className="h-14 px-10 rounded-2xl font-black">
              Check for Updates
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeDeliveries.map((delivery) => (
              <Card key={delivery._id} className="group overflow-hidden bg-white border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] flex flex-col border border-gray-50">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black tracking-widest shadow-xl">
                      ORD-#{delivery.orderId?._id?.slice(-6).toUpperCase() || delivery.orderId?.slice(-6).toUpperCase()}
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      delivery.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      {delivery.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-wider">
                    <Clock size={14} />
                    {delivery.createdAt ? new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8 flex-1">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Customer Details</p>
                      <h4 className="text-xl font-black text-gray-900 mb-1">{delivery.customerName || 'B2B Partner'}</h4>
                      <button 
                        onClick={() => handleCallCustomer(delivery.phone)} 
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black transition-all group/call"
                      >
                        <div className="p-2 bg-blue-50 rounded-lg group-hover/call:bg-blue-100">
                          <Phone size={14} />
                        </div>
                        {delivery.phone || 'N/A'}
                      </button>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Package Details</p>
                      <div className="flex items-center gap-3 text-gray-600 font-bold bg-gray-50 px-4 py-3 rounded-2xl w-fit border border-gray-100">
                        <Package size={18} className="text-blue-500" />
                        <span>{delivery.orderId?.items?.length || 0} Items packed</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                  </div>

                  <div className="sm:border-l border-gray-50 sm:pl-8">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Destination</p>
                    <div className="flex gap-4">
                      <div className="p-3 bg-rose-50 rounded-2xl text-rose-500 h-fit">
                        <MapPin size={20} />
                      </div>
                      <div className="space-y-4">
                        <p className="text-base font-bold text-gray-700 leading-relaxed">
                          {delivery.address || 'Address not provided'}
                        </p>
                        <Button 
                          onClick={() => handleOpenMaps(delivery.address)}
                          variant="secondary"
                          className="h-10 px-4 rounded-xl text-xs font-black flex items-center gap-2 bg-blue-50 border-none text-blue-600 hover:bg-blue-100 transition-all"
                        >
                          <Navigation size={14} /> Open in Maps
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                  {delivery.status === 'ASSIGNED' && (
                    <Button 
                      className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:-translate-y-1"
                      onClick={() => handleUpdateStatus(delivery._id, 'OUT_FOR_DELIVERY')}
                      loading={isUpdating[delivery._id]}
                    >
                      Start Delivery
                    </Button>
                  )}
                  {delivery.status === 'OUT_FOR_DELIVERY' && (
                    <Button 
                      className="flex-1 h-14 rounded-2xl font-black shadow-xl shadow-emerald-100 bg-emerald-600 hover:bg-emerald-700 text-white transition-all transform hover:-translate-y-1"
                      onClick={() => handleUpdateStatus(delivery._id, 'DELIVERED')}
                      loading={isUpdating[delivery._id]}
                    >
                      Confirm Delivery
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    className="px-8 h-14 rounded-2xl font-black border-2 border-gray-100 bg-white hover:bg-gray-50 transition-all"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryPage;
