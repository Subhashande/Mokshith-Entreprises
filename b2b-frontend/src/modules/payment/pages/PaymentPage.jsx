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
        // 🔥 IMPROVED: Try direct fetch if available
        if (orderService.getOrderById) {
          const res = await orderService.getOrderById(orderId);
          setOrder(res.data || res);
        } else {
          // fallback (your existing logic)
          const response = await orderService.getOrders();
          const orders = response.data || response;
          const foundOrder = orders.find(o => o._id === orderId);

          if (!foundOrder) {
            alert('Order not found');
            navigate(routes.ORDERS);
            return;
          }

          setOrder(foundOrder);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        alert('Failed to load order');
        navigate(routes.ORDERS);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  const handleRazorpayPayment = async (useCredit = false) => {
    setProcessing(true);

    try {
      // 🔥 FIXED: correct API call already updated in service
      const { data: hybridRes } = await paymentService.hybridPayment(
        orderId,
        useCredit
      );

      // 🔥 CASE 1: Fully paid via credit
      if (hybridRes.paidFullyByCredit) {
        alert('Payment successful via Credit!');
        navigate(routes.ORDERS);
        return;
      }

      // 🔥 CASE 2: Razorpay required
      if (!hybridRes.gateway) {
        throw new Error('Payment gateway not initialized');
      }

      const rzpOrder = hybridRes.gateway;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        name: "Mokshith Enterprises",
        description: `Payment for Order #${orderId}`,
        order_id: rzpOrder.gatewayOrderId,

        handler: async function (response) {
          try {
            await paymentService.verifyPayment({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            alert('Payment Successful!');
            navigate(routes.ORDERS);
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment verification failed. Please contact support.');
          }
        },

        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },

        theme: {
          color: "#3399cc",
        },
      };

      // 🔥 SAFETY CHECK
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        alert(`Payment failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (err) {
      console.error('Payment Error:', err);
      alert(err.message || 'Failed to initiate payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreditOnlyPayment = async () => {
    await handleRazorpayPayment(true);
  };

  if (loading) return <Loader />;
  if (!order) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Card title={`Complete Payment for Order #${orderId}`}>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Order Total:</span>
            <span style={{ fontWeight: 'bold' }}>
              ₹{order.totalAmount.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>Items:</span>
            <span>{order.items.length} items</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <Button
            onClick={() => handleRazorpayPayment(false)}
            disabled={processing}
            style={{ height: '60px', fontSize: '1.1rem' }}
          >
            {processing ? 'Processing...' : 'Pay with Razorpay / UPI / Card'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleCreditOnlyPayment}
            disabled={processing}
            style={{ height: '60px', fontSize: '1.1rem' }}
          >
            {processing ? 'Processing...' : 'Use Business Credit + Razorpay'}
          </Button>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p>Secure payment processed by Razorpay. GST invoice will be generated automatically.</p>
        </div>

      </Card>
    </div>
  );
};

export default PaymentPage;