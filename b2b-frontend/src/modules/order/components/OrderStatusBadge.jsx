const statusColors = {
  pending: "orange",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

const OrderStatusBadge = ({ status }) => {
  return (
    <span style={{ color: statusColors[status] || "gray" }}>
      {status.toUpperCase()}
    </span>
  );
};

export default OrderStatusBadge;