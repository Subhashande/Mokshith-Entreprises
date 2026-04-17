import { useOrder } from "../hooks/useOrder";
import OrderStatusBadge from "../components/OrderStatusBadge";
import OrderTimeline from "../components/OrderTimeline";

const OrdersPage = () => {
  const { orders, loading, error } = useOrder();

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Orders</h1>

      {orders.map((order) => (
        <div key={order.id}>
          <h3>Order ID: {order.id}</h3>

          <OrderStatusBadge status={order.status} />

          <OrderTimeline timeline={order.timeline} />

          <ul>
            {order.items.map((item, idx) => (
              <li key={idx}>
                {item.name} × {item.quantity} = ₹{item.price}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default OrdersPage;