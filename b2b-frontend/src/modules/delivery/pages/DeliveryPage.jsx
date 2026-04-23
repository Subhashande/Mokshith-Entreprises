import { useState, useEffect } from "react";
import { useDelivery } from "../hooks/useDelivery";
import { useAuth } from "../../auth/hooks/useAuth";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { 
  Truck, 
  MapPin, 
  Phone, 
  Package, 
  CheckCircle2, 
  Clock, 
  Navigation,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCcw
} from "lucide-react";

const DeliveryPage = () => {
  const { deliveries, loading, error, updateDeliveryStatus, fetchDeliveries } = useDelivery();
  const { user } = useAuth();

  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const activeDeliveries = safeDeliveries.filter(d => d.status !== 'DELIVERED');

  const getStatusColor = (status) => {
    switch (status) {
      case 'ASSIGNED': return '#64748b'; // gray
      case 'OUT_FOR_DELIVERY': return '#3b82f6'; // blue
      case 'DELIVERED': return '#22c55e'; // green
      default: return '#64748b';
    }
  };

  const activeCount = activeDeliveries.length;
  const completedToday = safeDeliveries.filter(d => d.status === 'DELIVERED').length;
  const earningsToday = completedToday * 50; // Simple simulation

  const handleOpenMaps = (address) => {
    if (!address || address === 'Address not provided') {
      alert("Invalid delivery address");
      return;
    }
    const query = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    window.open(url, '_blank');
  };

  const handleCallCustomer = (phone) => {
    if (!phone || phone === 'N/A') {
      alert("Customer phone number not available");
      return;
    }
    window.open(`tel:${phone}`, '_self');
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDeliveryStatus(id, status);
      // Success feedback
    } catch (err) {
      alert("Failed to update status. Please try again.");
    }
  };

  if (loading && safeDeliveries.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Truck size={48} className="animate-bounce" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
      <p style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-muted)' }}>Syncing delivery routes...</p>
    </div>
  );

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, min-minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.25rem' }}>Active Deliveries</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{activeCount}</h3>
            </div>
            <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '12px', color: '#3b82f6' }}>
              <Truck size={24} />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.25rem' }}>Completed Today</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{completedToday}</h3>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '12px', color: '#22c55e' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </Card>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600', marginBottom: '0.25rem' }}>Earnings Today</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{earningsToday}</h3>
            </div>
            <div style={{ backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '12px', color: '#f59e0b' }}>
              <TrendingUp size={24} />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>My Assignments</h2>
          <p style={{ color: '#64748b', fontWeight: '500' }}>Real-time delivery queue and route management</p>
        </div>
        <button 
          onClick={fetchDeliveries} 
          disabled={loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: 'white', 
            border: '1px solid #e2e8f0', 
            padding: '0.625rem 1rem', 
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {error && !deliveries.length && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#fef2f2', borderRadius: '16px', border: '1px solid #fee2e2', marginBottom: '2rem' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem', margin: '0 auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.5rem' }}>Connection Issue</h3>
          <p style={{ color: '#b91c1c', marginBottom: '1.5rem' }}>{error}</p>
          <Button onClick={fetchDeliveries}>Try Reconnecting</Button>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {activeDeliveries.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'white', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
            <div style={{ backgroundColor: '#f0fdf4', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#22c55e' }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>🎉 No active deliveries</h3>
            <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '400px', margin: '0 auto' }}>You've cleared your queue! New assignments will appear here automatically.</p>
          </div>
        ) : (
          activeDeliveries.map((delivery) => (
            <Card key={delivery._id} style={{ borderRadius: '16px', overflow: 'hidden', padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Card Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '800' }}>
                      ORD-#{delivery.orderId?._id?.slice(-6).toUpperCase()}
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.375rem 0.75rem', 
                      borderRadius: '20px',
                      backgroundColor: getStatusColor(delivery.status),
                      color: 'white',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Clock size={16} style={{ marginRight: '0.375rem' }} />
                    {delivery.createdAt ? new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Customer Details</p>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>{delivery.customerName || 'Customer'}</h4>
                      <button 
                        onClick={() => handleCallCustomer(delivery.phone)} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          color: '#3b82f6', 
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontWeight: '700', 
                          fontSize: '0.9375rem' 
                        }}
                      >
                        <Phone size={16} /> {delivery.phone || 'N/A'}
                      </button>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Delivery Items</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: '600' }}>
                        <Package size={18} />
                        <span>{delivery.orderId?.items?.length || 0} Items packed</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '2rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Destination Address</p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <MapPin size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.125rem' }} />
                      <div>
                        <p style={{ fontSize: '0.9375rem', color: '#334155', fontWeight: '500', lineHeight: '1.5', marginBottom: '1rem' }}>
                          {delivery.address || 'Address not provided'}
                        </p>
                        <button 
                          onClick={() => handleOpenMaps(delivery.address)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            backgroundColor: '#eff6ff', 
                            color: '#3b82f6', 
                            border: 'none', 
                            padding: '0.5rem 0.75rem', 
                            borderRadius: '8px', 
                            fontSize: '0.8125rem', 
                            fontWeight: '700', 
                            cursor: 'pointer' 
                          }}
                        >
                          <Navigation size={14} /> Open in Google Maps
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
                  {delivery.status === 'ASSIGNED' && (
                    <Button 
                      style={{ flex: 1, backgroundColor: '#3b82f6' }}
                      onClick={() => handleUpdateStatus(delivery._id, 'OUT_FOR_DELIVERY')}
                    >
                      Start Delivery
                    </Button>
                  )}
                  {delivery.status === 'OUT_FOR_DELIVERY' && (
                    <Button 
                      style={{ flex: 1, backgroundColor: '#22c55e' }}
                      onClick={() => handleUpdateStatus(delivery._id, 'DELIVERED')}
                    >
                      Confirm Delivery
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    style={{ flex: delivery.status === 'DELIVERED' ? 1 : 0.4, backgroundColor: 'white' }}
                    onClick={() => handleSimulateNav(delivery)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default DeliveryPage;