import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Wallet, 
  ChevronRight, 
  CheckCircle, 
  FileText, 
  Package, 
  ShieldCheck,
  Info,
  ArrowRight,
  Truck,
  QrCode,
  Smartphone,
  Banknote,
  Lock
} from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { creditService } from '../../credit/services/creditService';
import { orderService } from '../../order/services/orderService';
import { invoiceService } from '../../invoice/services/invoiceService';
import { useAuth } from '../../auth/hooks/useAuth';
import { routes } from '../../../routes/routeConfig';
import Button from '../../../components/ui/Button';
import { useSocket } from '../../../context/SocketContext';
import Loader from '../../../components/common/Loader';
import { useDispatch } from 'react-redux';
import { clearCart } from '../../order/orderSlice';
import {
  validateRazorpayResponse,
  validatePaymentAmount,
  sanitizePaymentData,
  PaymentDuplicateDetector,
  PaymentErrorHandler,
  PaymentLogger,
  validateRazorpayConfig,
  ensureRazorpayLoaded
} from '../utils/paymentSecurity';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [order, setOrder] = useState(null);
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [deliveryAssigned, setDeliveryAssigned] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔥 WAIT FOR RAZORPAY SDK
      const isSdkLoaded = await ensureRazorpayLoaded();
      
      // 🔥 VALIDATE CONFIG
      const configValidation = validateRazorpayConfig();
      const errors = [...configValidation.errors];
      
      if (!isSdkLoaded) {
        errors.push('Razorpay SDK failed to load. Please check your internet connection or disable ad-blockers.');
      }

      if (errors.length > 0) {
        const errorMsg = errors.join(' | ');
        console.error('❌ Razorpay configuration errors:', errors);
        setError(`Payment configuration error: ${errorMsg}`);
        setLoading(false);
        return;
      }

      const [orderRes, creditRes] = await Promise.all([
        orderService.getOrderById(orderId),
        creditService.getCreditInfo()
      ]);

      const orderData = orderRes.data || orderRes;
      const creditData = creditRes.data || creditRes;

      if (!orderData) {
        setError('Order not found.');
        return;
      }

      setOrder(orderData);
      setCredit(creditData);

      // Pre-select payment method
      if (creditData?.availableCredit >= orderData?.totalAmount) {
        setPaymentMethod('credit');
      } else if (creditData?.availableCredit > 0) {
        setPaymentMethod('hybrid');
      } else {
        setPaymentMethod('online');
      }

      PaymentLogger.log('Page loaded', { orderId, totalAmount: orderData?.totalAmount });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load payment details.');
      PaymentLogger.error('Data fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderId]);

  useEffect(() => {
    if (!socket) return;
    const handleSuccess = (data) => {
      if (data.orderId === orderId) {
        setPaymentSuccess(true);
        setProcessing(false);
      }
    };
    const handleDelivery = (data) => {
      if (data.orderId === orderId) {
        setDeliveryAssigned(true);
      }
    };
    socket.on('payment:success', handleSuccess);
    socket.on('delivery:assigned', handleDelivery);
    return () => {
      socket.off('payment:success', handleSuccess);
      socket.off('delivery:assigned', handleDelivery);
    };
  }, [socket, orderId]);

  const calculateBreakdown = () => {
    const total = order?.totalAmount || 0;
    const available = credit?.availableCredit || 0;

    if (paymentMethod === 'credit') {
      return { creditUsed: Math.min(total, available), onlinePayable: 0 };
    } else if (paymentMethod === 'hybrid') {
      return { creditUsed: available, onlinePayable: total - available };
    }
    return { creditUsed: 0, onlinePayable: total };
  };

  const { creditUsed, onlinePayable } = calculateBreakdown();

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      console.log('💳 Initiating payment...', {
        orderId,
        paymentMethod,
        totalAmount: order?.totalAmount
      });

      // 🔥 CALL HYBRID PAYMENT API
      const { data: hybridRes } = await paymentService.hybridPayment(
        orderId,
        paymentMethod !== 'online',
        order.totalAmount
      );

      console.log('✅ Hybrid payment response:', hybridRes);

      // 🔥 SCENARIO 1: Fully paid by credit
      if (hybridRes.paidFullyByCredit || hybridRes.data?.paidFullyByCredit) {
        console.log('✅ Order paid fully by credit');
        dispatch(clearCart());
        setPaymentSuccess(true);
        setProcessing(false);
        return;
      }

      // 🔥 SCENARIO 2: Need Razorpay payment
      const rzpOrder = hybridRes.gateway || hybridRes.data?.gateway;
      
      if (!rzpOrder || (!rzpOrder.gatewayOrderId && !rzpOrder.id)) {
        throw new Error('Invalid Razorpay order response');
      }

      const gatewayOrderId = rzpOrder.gatewayOrderId || rzpOrder.id;

      console.log('💰 Opening Razorpay modal...', {
        amount: rzpOrder.amount,
        orderId: gatewayOrderId
      });

      // 🔥 RAZORPAY OPTIONS - MULTIPLE PAYMENT METHODS
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount, // Amount in paise
        currency: 'INR',
        name: "Mokshith Enterprises",
        description: `Order Payment #${orderId.slice(-8)}`,
        order_id: gatewayOrderId,
        
        // 🔥 ENABLE MULTIPLE PAYMENT METHODS
        method: {
          upi: true,          // ✅ UPI (GPay, PhonePe, PayTM, etc.)
          card: true,         // ✅ Credit/Debit Cards
          netbanking: true,   // ✅ Net Banking
          wallet: true,       // ✅ Digital Wallets (PayTM, Freecharge, etc.)
          emi: false,         // Disable EMI for now
        },
        
        // 🔥 SUCCESS HANDLER
        handler: async function (response) {
          try {
            // Remove sensitive logging of full response in production
            if (import.meta.env.DEV) {
              PaymentLogger.log('Razorpay response received', response);
            }

            // 🔥 SECURITY 1: Validate response fields
            const validation = validateRazorpayResponse(response);
            if (!validation.isValid) {
              const errorMsg = validation.errors.join(', ');
              PaymentLogger.error('Response validation failed', errorMsg);
              setError('Invalid payment response. Please try again.');
              setProcessing(false);
              return;
            }

            // 🔥 SECURITY 2: Check for duplicate payment processing
            if (PaymentDuplicateDetector.isDuplicate(response.razorpay_payment_id)) {
              PaymentLogger.log('Duplicate payment detected', response.razorpay_payment_id);
            }

            setProcessing(true);
            setError(null);

            // 🔥 SECURITY 3: Sanitize payment data before sending
            const sanitizedData = sanitizePaymentData({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // 🔥 VERIFY PAYMENT ON BACKEND
            await paymentService.verifyPayment(sanitizedData);

            // 🔥 SECURITY 4: Mark as processed
            PaymentDuplicateDetector.markProcessed(response.razorpay_payment_id);

            dispatch(clearCart());
            setPaymentSuccess(true);
            setProcessing(false);
          } catch (err) {
            console.error('❌ Payment verification failed');
            PaymentLogger.error('Verification failed', err);

            const errorMsg = PaymentErrorHandler.getMessage(err);
            setError(errorMsg);
            setProcessing(false);
          }
        },

        // 🔥 MODAL OPTIONS
        modal: {
          ondismiss: async function() {
            console.log('❌ Razorpay modal closed by user');
            setProcessing(false);
            setError('Payment cancelled. You can retry whenever you are ready.');
            
            // We DON'T mark as failed immediately on dismiss to allow retries.
            // The order remains in PENDING_PAYMENT status.
          }
        },
        
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        
        theme: { 
          color: "#2563eb",
          backdrop_color: "rgba(0, 0, 0, 0.7)"
        },
        
        // 🔥 NOTES FOR BACKEND
        notes: {
          orderId: orderId,
          userId: user?.id,
          paymentMethod: paymentMethod
        },

        // 🔥 RETRY LOGIC
        timeout: 600  // 10 minutes timeout
      };

      // 🔥 OPEN RAZORPAY
      if (!window.Razorpay) {
        throw new Error('Razorpay is not loaded. Please refresh the page.');
      }

      const razorpayInstance = new window.Razorpay(options);

      // 🔥 HANDLE FAILED PAYMENTS (INSUFFICIENT FUNDS, ETC)
      razorpayInstance.on('payment.failed', async function (response) {
        console.error('❌ Razorpay payment failed:', response.error);
        PaymentLogger.error('Razorpay payment failed', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setProcessing(false);

        try {
          await orderService.markOrderAsFailed(orderId);
        } catch (err) {
          console.error('Failed to mark order as failed:', err);
        }
      });

      razorpayInstance.open();

    } catch (err) {
      console.error('❌ PAYMENT ERROR:', err);
      
      const errorMessage = 
        typeof err === "string" 
          ? err
          : err.response?.data?.message ||
            err.message ||
            'Payment failed. Please try again.';

      setError(errorMessage);
      setProcessing(false);
    }
  };
  //       modal: { ondismiss: () => setProcessing(false) }
  //     };

  //     const rzp = new window.Razorpay(options);
  //     rzp.open();
  //   } catch (err) {
  //     setError(err.message || 'Payment failed');
  //     setProcessing(false);
  //   }
  // };

  const handleDownloadInvoice = async () => {
    try {
      setProcessing(true);
      setError(null);

      console.log('📄 Fetching invoice...');

      // Try to get existing invoice
      const res = await invoiceService.getInvoiceByOrderId(orderId);
      const invoiceData = res.data || res;
      
      if (invoiceData?.fileUrl) {
        console.log('✅ Invoice found, opening...');
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
        const fileUrl = invoiceData.fileUrl.startsWith('http') 
          ? invoiceData.fileUrl 
          : `${baseUrl}${invoiceData.fileUrl}`;
        window.open(fileUrl, '_blank');
        return;
      }

      // If invoice doesn't exist, generate it
      console.log('📋 Generating invoice...');
      const genRes = await invoiceService.generateInvoice(orderId);
      const genData = genRes.data || genRes;

      if (genData?.fileUrl) {
        console.log('✅ Invoice generated, opening...');
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
        const fileUrl = genData.fileUrl.startsWith('http') 
          ? genData.fileUrl 
          : `${baseUrl}${genData.fileUrl}`;
        window.open(fileUrl, '_blank');
      } else {
        console.warn('⚠️ Invoice generation in progress');
        setError('Invoice is being generated. Please try again in a moment.');
      }
    } catch (err) {
      console.error('❌ Error with invoice:', err);
      setError('Could not download invoice. Please try from the Orders section.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader /></div>;
  
  if (!order) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
        <Package size={32} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
      <p className="text-gray-500 max-w-xs">We couldn't find the order you're looking for.</p>
      <Button onClick={() => navigate(routes.ORDERS)} variant="secondary">Go to Orders</Button>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Info className="text-red-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" fullWidth onClick={() => navigate(routes.ORDERS)}>Orders</Button>
          <Button variant="primary" fullWidth onClick={() => fetchData()}>Retry</Button>
        </div>
      </div>
    </div>
  );

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-100/50 overflow-hidden border border-blue-50">
            <div className="bg-blue-600 px-8 py-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-xl">
                <CheckCircle className="text-blue-600" size={48} />
              </div>
              <h2 className="relative text-3xl font-black text-white mb-2 tracking-tight">Order Confirmed!</h2>
              <p className="relative text-blue-100 text-lg font-medium opacity-90">Order #{orderId.slice(-8).toUpperCase()}</p>
            </div>
            <div className="p-8 sm:p-10">
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Payment Status</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-widest">Paid</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Delivery Partner</span>
                    <div className="flex items-center gap-2">
                      {deliveryAssigned ? (
                        <span className="text-blue-600 font-black text-sm flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                          <Truck size={14} /> PARTNER ASSIGNED
                        </span>
                      ) : (
                        <span className="text-orange-500 font-black text-sm flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                          ASSIGNING AGENT...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" /> Order Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-gray-600 font-medium">Subtotal</span>
                      <span className="text-gray-900 font-bold">₹{(order.totalAmount / 1.18).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-900 font-black text-lg">Total Amount</span>
                      <span className="text-2xl font-black text-blue-600">₹{order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <Button variant="secondary" onClick={handleDownloadInvoice} className="rounded-xl h-14 font-black border-2 border-gray-200">
                    <FileText size={18} /> INVOICE
                  </Button>
                  <Button onClick={() => navigate(routes.ORDERS || '/orders')} className="rounded-xl h-14 font-black bg-blue-600 text-white">
                    MY ORDERS <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto p-4 py-8">
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-400 font-medium">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>Home</span>
          <ChevronRight size={14} />
          <span className="text-blue-600 font-bold">Payment</span>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-200 -z-0"></div>
            {['Cart', 'Checkout', 'Payment', 'Delivery'].map((step, idx) => (
              <div key={step} className="flex flex-col items-center relative z-10 bg-slate-50 px-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  idx < 2 ? 'bg-blue-600 border-blue-600 text-white' : idx === 2 ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {idx < 2 ? <CheckCircle size={20} /> : <span className="font-bold text-sm">{idx + 1}</span>}
                </div>
                <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-900">{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-600" /> Select Payment Method
            </h2>

            {/* 🔥 ENHANCED PAYMENT METHODS */}
            <div className="grid grid-cols-1 gap-4">
              {/* ONLINE PAYMENT OPTION */}
              <div onClick={() => setPaymentMethod('online')} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-blue-600 bg-blue-50/40 shadow-xl' : 'border-white bg-white shadow-sm hover:border-blue-200'}`}>
                <div className="space-y-4">
                  <div className="flex items-start gap-5">
                    <div className={`p-4 rounded-2xl flex-shrink-0 ${paymentMethod === 'online' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                      <CreditCard size={28} />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Online Payment</h3>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full">UPI</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full">CARDS</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Pay securely with multiple methods</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Smartphone size={14} className="text-purple-600" /> <span>UPI (GPay, PhonePe)</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard size={14} className="text-blue-600" /> <span>Credit/Debit Cards</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Banknote size={14} className="text-green-600" /> <span>NetBanking</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Wallet size={14} className="text-orange-600" /> <span>Digital Wallets</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${paymentMethod === 'online' ? 'bg-white text-blue-600' : 'text-gray-600'}`}>
                    <Lock size={14} /> Secured by Razorpay
                  </div>
                </div>
              </div>

              {/* CREDIT OPTION */}
              {credit?.availableCredit > 0 && (
                <div onClick={() => setPaymentMethod(credit.availableCredit >= order.totalAmount ? 'credit' : 'hybrid')} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${paymentMethod !== 'online' ? 'border-blue-600 bg-blue-50/40 shadow-xl' : 'border-white bg-white shadow-sm hover:border-blue-200'}`}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-5">
                      <div className={`p-4 rounded-2xl flex-shrink-0 ${paymentMethod !== 'online' ? 'bg-blue-600 text-white' : 'bg-green-50 text-green-600'}`}>
                        <Wallet size={28} />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-900">Business Credit</h3>
                          {credit.availableCredit >= order.totalAmount && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-black rounded-full">FULL COVERAGE</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Use your available credit balance</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600">Available Balance:</span>
                          <span className="text-lg font-black text-green-600">₹{credit.availableCredit.toLocaleString()}</span>
                        </div>
                        {credit.availableCredit < order.totalAmount && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs font-bold text-blue-700">
                              💡 Tip: Use hybrid payment to combine credit with online payment
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY BADGE */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-600">
                <Lock size={18} className="text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-gray-900">Secure Payment</p>
                  <p className="text-gray-600 text-xs">PCI-DSS compliant • SSL Encrypted • Instant Verification</p>
                </div>
              </div>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl border-2 border-red-100 flex gap-4"><Info />{error}</div>}
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-slate-900 p-6 text-white">
                <h2 className="text-xl font-black tracking-tight uppercase">Order Summary</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Order #{orderId.slice(-8).toUpperCase()}</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between font-bold text-gray-700">
                    <span>Subtotal</span>
                    <span>₹{(order.totalAmount / 1.18).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-green-600">
                    <span>Delivery</span>
                    <span>FREE</span>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-gray-100 pt-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Final Payable</p>
                      <p className="text-4xl font-black text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                {paymentMethod !== 'online' && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-500">Credit Used</span>
                      <span className="text-purple-600">-₹{creditUsed.toLocaleString()}</span>
                    </div>
                    {onlinePayable > 0 && (
                      <div className="flex justify-between pt-3 border-t text-blue-600 font-black text-lg">
                        <span>Net Online</span>
                        <span>₹{onlinePayable.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
                <Button fullWidth onClick={handlePayment} loading={processing} className="h-16 text-xl font-black rounded-2xl bg-blue-600 text-white">
                  {onlinePayable > 0 ? 'PAY NOW' : 'CONFIRM ORDER'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
