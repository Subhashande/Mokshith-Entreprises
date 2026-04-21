import { useState } from "react";
import { useDelivery } from "../hooks/useDelivery";
import { useAuth } from "../../auth/hooks/useAuth";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";

const DeliveryPage = () => {
  const { deliveries, loading, error, updateDeliveryStatus } = useDelivery();
  const { logout } = useAuth();
  const [activeTab, setActiveCollection] = useState("ASSIGNED");

  const handleUpdateStatus = (id, currentStatus) => {
    const statuses = ['PENDING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    updateDeliveryStatus(id, nextStatus);
  };

  const handleSimulateNav = (address) => {
    alert(`Simulating GPS Navigation to:\n${address}\n\nEstimated arrival: 15 minutes.`);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Syncing delivery routes...</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  return (
    <div style={{ padding: '0.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>My Assignments</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage your active deliveries and update statuses</p>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.125rem' }}>#{delivery.orderId}</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      backgroundColor: delivery.status === 'PENDING' ? 'var(--warning)' : 'var(--info)',
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {delivery.status}
                    </span>
                  </div>
                  <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{delivery.customerName}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{delivery.address}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Items: {delivery.items}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <Button 
                  size="small" 
                  style={{ flex: 1 }}
                  onClick={() => handleUpdateStatus(delivery.id, delivery.status)}
                >
                  Update Status
                </Button>
                <Button 
                  variant="secondary" 
                  size="small" 
                  style={{ flex: 1 }}
                  onClick={() => handleSimulateNav(delivery.address)}
                >
                  View Navigation
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;
