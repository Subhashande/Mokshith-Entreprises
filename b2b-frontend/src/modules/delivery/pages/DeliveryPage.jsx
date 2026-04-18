import { useDelivery } from "../hooks/useDelivery";
import RouteMap from "../components/RouteMap";

const DeliveryPage = () => {
  const { deliveries, loading, error } = useDelivery();

  if (loading) return <p>Loading deliveries...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Delivery Tracking</h1>

      {deliveries.map((delivery) => (
        <div key={delivery.id}>
          <h3>Order: {delivery.orderId}</h3>
          <p>Status: {delivery.status}</p>

          <RouteMap route={delivery.route} />
        </div>
      ))}
    </div>
  );
};

export default DeliveryPage;