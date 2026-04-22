import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../services/paymentService';
import { creditService } from '../../credit/services/creditService';
import { orderService } from '../../order/services/orderService';
import { useAuth } from '../../auth/hooks/useAuth';
import { routes } from '../../../routes/routeConfig';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Loader from '../../../components/common/Loader';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await orderService.getOrders();
        const orders = response.data || response;
        const foundOrder = orders.find(o => o._id === orderId);
        if (!foundOrder) {
          alert('Order not found');
          navigate(routes.ORDERS);
          return;
        }
        setOrder(foundOrder);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    try {
      // 1. Create Razorpay Order on Backend
      const { data: rzpOrder } = await paymentService.createRazorpayOrder(order.totalAmount);

      // 2. Configure Razorpay Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Mokshith Enterprises",
        description: `Payment for Order #${orderId}`,
        order_id: rzpOrder.gatewayOrderId,
        handler: async function (response) {
          try {
            // 3. Verify Payment on Backend
            await paymentService.verifyPayment({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            alert('Payment Successful!');
            navigate(routes.ORDERS);
          } catch (err) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.mobile,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      alert('Failed to initiate payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreditPayment = async () => {
    setProcessing(true);
    try {
      await creditService.useCredit(orderId);
      alert('Payment successful via Credit!');
      navigate(routes.ORDERS);
    } catch (err) {
      alert(err.message || 'Credit payment failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loader />;
  if (!order) return null;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card title="Complete Payment">
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Order ID:</span>
            <span>{order._id}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Total Amount:</span>
            <span className="text-xl font-bold">₹{order.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-semibold">Payment Method Selected:</span>
            <span className="uppercase">{order.paymentMethod}</span>
          </div>

          <div className="mt-8 space-y-4">
            {order.paymentMethod === 'CREDIT' ? (
              <Button 
                onClick={handleCreditPayment} 
                className="w-full py-3" 
                loading={processing}
              >
                Pay via Credit
              </Button>
            ) : (
              <Button 
                onClick={handleRazorpayPayment} 
                className="w-full py-3" 
                loading={processing}
              >
                Pay via Razorpay
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate(routes.CHECKOUT)} 
              className="w-full"
              disabled={processing}
            >
              Cancel & Go Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentPage;
