import { useOrder } from "../hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";
import { ORDER_STATUS } from "../../../utils/constants";

const OrdersPage = () => {
  const { orders, loading, error } = useOrder(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Fetching your orders...</p>
    </div>
  );
  
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--error)' }}>{error}</p>
      <Button onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Retry</Button>
    </div>
  );

  const filteredOrders = orders.filter(order => order.status !== ORDER_STATUS.FAILED);

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Order History</h2>
          <p style={{ color: 'var(--text-muted)' }}>Track and manage your past business purchases</p>
        </div>

        {filteredOrders.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
            <Button onClick={() => navigate(routes.PRODUCTS)}>Start Shopping</Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredOrders.map((order) => (
              <Card key={order._id || order.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.125rem' }}>Order #{order._id || order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Placed on {new Date(order.createdAt || order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Amount</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>₹{(order.totalAmount || order.total || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: idx === (order.items?.length || 0) - 1 ? 0 : '0.5rem' }}>
                      <span>{item.name} <span style={{ color: 'var(--text-muted)' }}>× {item.quantity}</span></span>
                      <span style={{ fontWeight: '600' }}>₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button size="small" variant="secondary" style={{ flex: 1 }}>Download Invoice</Button>
                  <Button size="small" style={{ flex: 1 }}>Reorder Items</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;
