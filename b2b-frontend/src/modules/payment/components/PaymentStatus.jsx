const statusStyles = {
  success: { color: "green" },
  failed: { color: "red" },
  pending: { color: "orange" },
};

const PaymentStatus = ({ status }) => {
  return (
    <span style={statusStyles[status] || {}}>
      {status.toUpperCase()}
    </span>
  );
};

export default PaymentStatus;