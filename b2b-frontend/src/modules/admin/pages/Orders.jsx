import { useEffect, useState } from "react";
import { useOrder } from "../../order/hooks/useOrder";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import OrderStatusBadge from "../../order/components/OrderStatusBadge";
import { orderService } from "../../order/services/orderService";

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrders();
      setOrders(response.data || response);
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      alert("Status updated!");
      fetchAllOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Loading Admin Orders...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Platform Order Management</h2>
            <p style={{ color: 'var(--text-muted)' }}>Monitor customer activity and fulfill business orders</p>
          </div>
          <Button onClick={fetchAllOrders} variant="secondary">Refresh List</Button>
        </div>

        {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {orders.map((order) => (
            <Card key={order._id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Column 1: Order & Customer Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '800' }}>#{order._id.slice(-6)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{order.userId?.name || 'Unknown User'}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.userId?.email}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.userId?.phone}</p>
                </div>

                {/* Column 2: Products */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Products</p>
                  {order.items.map((item, idx) => (
                    <p key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      {item.name} <span style={{ color: 'var(--primary)', fontWeight: '600' }}>×{item.quantity}</span>
                    </p>
                  ))}
                </div>

                {/* Column 3: Payment & Total */}
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Payment</p>
                  <p style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{order.totalAmount?.toLocaleString()}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: '600' }}>
                      {order.paymentMethod}
                    </span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: order.paymentStatus === 'PAID' ? 'var(--success)' : 'var(--error)',
                      fontWeight: '700'
                    }}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Column 4: Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Placed: {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <select 
                    style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirm Order</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="PACKED">Packed</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancel</option>
                  </select>
                </div>
              </div>
            </Card>
          ))}

          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No orders found on the platform.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminOrdersPage;
