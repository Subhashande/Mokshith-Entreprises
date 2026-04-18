import { usePayment } from "../hooks/usePayment";
import PaymentStatus from "../components/PaymentStatus";

const PaymentPage = () => {
  const { payments, loading, error } = usePayment();

  if (loading) return <p>Loading payments...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Payments</h1>

      {payments.map((payment) => (
        <div key={payment.id}>
          <h3>Order ID: {payment.orderId}</h3>

          <p>Amount: ₹{payment.amount}</p>

          <p>
            Status: <PaymentStatus status={payment.status} />
          </p>

          <p>Method: {payment.method}</p>

          <p>Date: {new Date(payment.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

export default PaymentPage;