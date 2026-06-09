import React, { useEffect, useState, useRef } from 'react';
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
  Lock,
  Loader2
} from 'lucide-react';
import { paymentService } from '../services/paymentService.js';
import { creditService } from '../../credit/services/creditService.js';
import { orderService } from '../../order/services/orderService.js';
import { invoiceService } from '../../invoice/services/invoiceService.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { routes } from '../../../routes/routeConfig.js';
import Button from '../../../components/ui/Button.jsx';
import { useSocket } from '../../../context/SocketContext.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { useDispatch } from 'react-redux';
import { clearCart } from '../../order/orderSlice.js';
import {
  validateRazorpayResponse,
  validatePaymentAmount,
  sanitizePaymentData,
  PaymentDuplicateDetector,
  PaymentErrorHandler,
  PaymentLogger,
  validateRazorpayConfig,
  ensureRazorpayLoaded
} from '../utils/paymentSecurity.js';

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
  const isInitiating = useRef(false);

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
      if (orderData.paymentMethod === 'COD') {
        setPaymentMethod('cod');
      } else if (creditData?.availableCredit >= orderData?.totalAmount) {
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
    if (processing || isInitiating.current) return;
    
    setProcessing(true);
    isInitiating.current = true;
    setError(null);

    try {
      console.log('💳 Initiating payment...', {
        orderId,
        paymentMethod,
        totalAmount: order?.totalAmount
      });

      // 🔥 SCENARIO 0: COD PAYMENT
      if (paymentMethod === 'cod') {
        console.log('🚚 Processing COD order...');
        await paymentService.hybridPayment(
          orderId,
          false, // useCredit
          order.totalAmount,
          'COD' // Pass paymentMethod explicitly
        );
        dispatch(clearCart());
        setPaymentSuccess(true);
        setProcessing(false);
        return;
      }

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
        // method: {
        //   upi: true,          // ✅ UPI (GPay, PhonePe, PayTM, etc.)
        //   card: true,         // ✅ Credit/Debit Cards
        //   netbanking: true,   // ✅ Net Banking
        //   wallet: true,       // ✅ Digital Wallets (PayTM, Freecharge, etc.)
        //   emi: false,         // Disable EMI for now
        // },
        
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
            isInitiating.current = false;
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
        isInitiating.current = false;

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
      isInitiating.current = false;
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
      console.log('📄 Downloading invoice...');
      await orderService.downloadInvoice(orderId);
      console.log('✅ Invoice download triggered');
    } catch (err) {
      console.error('❌ Error downloading invoice:', err);
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
    const isCOD = order?.paymentMethod === 'COD' || paymentMethod === 'cod';

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/30 overflow-hidden border border-slate-100">
            <div className="bg-slate-900 px-8 py-16 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
              
              <div className="relative inline-flex items-center justify-center w-28 h-28 bg-white/10 rounded-3xl mb-8 backdrop-blur-md border border-white/20 shadow-2xl">
                <CheckCircle className="text-emerald-400" size={56} />
              </div>
              <h2 className="relative text-4xl font-black text-white mb-3 tracking-tight uppercase">Order Confirmed!</h2>
              <div className="relative inline-block px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-blue-400 text-sm font-black tracking-widest uppercase">Reference ID: #{orderId.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            <div className="p-10 md:p-12">
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</p>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCOD ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {isCOD ? <Truck size={20} /> : <CheckCircle size={20} />}
                      </div>
                      <span className={`text-sm font-black uppercase tracking-wider ${isCOD ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {isCOD ? 'Pay on Delivery' : 'Payment Successful'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistics Status</p>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Package size={20} />
                      </div>
                      <span className="text-sm font-black text-blue-600 uppercase tracking-wider">
                        {deliveryAssigned ? 'Partner Assigned' : 'Preparing Order'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-10">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <FileText size={18} className="text-blue-600" /> Transaction Summary
                  </h3>
                  <div className="space-y-4 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="text-sm font-bold uppercase tracking-wider">Net Amount</span>
                      <span className="text-lg font-bold">₹{(order.totalAmount / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="text-sm font-bold uppercase tracking-wider">Taxes (18% GST)</span>
                      <span className="text-lg font-bold">₹{(order.totalAmount - (order.totalAmount / 1.18)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-6 mt-4 border-t border-slate-200 flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Amount Paid</p>
                        <p className="text-4xl font-black text-blue-600 tracking-tighter leading-none">₹{order.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest border border-blue-200">
                        INVOICE ISSUED
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button 
                    onClick={handleDownloadInvoice} 
                    className="h-16 rounded-2xl font-black text-xs tracking-widest border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all uppercase flex items-center justify-center gap-3"
                  >
                    <FileText size={20} /> Download Invoice
                  </button>
                  <button 
                    onClick={() => navigate(routes.ORDERS || '/orders')} 
                    className="h-16 rounded-2xl font-black text-xs tracking-widest bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase flex items-center justify-center gap-3"
                  >
                    Go to My Orders <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-16 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
              <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigate('/')}>Home</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-blue-600">Secure Payment</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Complete Transaction</h1>
          </div>

          {/* Professional Stepper */}
          <div className="flex items-center bg-white px-8 py-4 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-100 ring-4 ring-emerald-50">
                <CheckCircle size={16} />
              </div>
              <div className="ml-4 mr-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Step 2</p>
                <p className="text-[11px] font-black text-slate-900 uppercase">Checkout</p>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100 mx-2"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
                <span className="text-xs font-black">3</span>
              </div>
              <div className="ml-4 mr-6">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Step 3</p>
                <p className="text-[11px] font-black text-slate-900 uppercase">Payment</p>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-100 mx-2"></div>
            <div className="flex items-center opacity-40">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-400 border border-slate-200">
                <span className="text-xs font-black">4</span>
              </div>
              <div className="ml-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Step 4</p>
                <p className="text-[11px] font-black text-slate-900 uppercase">Delivery</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-10">
            <div className="flex items-center gap-5 px-2">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-blue-100">
                <CreditCard size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Payment Method</h2>
                <p className="text-slate-500 font-bold text-sm">Select your preferred business settlement method</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* COD OPTION */}
              {order.paymentMethod === 'COD' && (
                <div 
                  onClick={() => setPaymentMethod('cod')} 
                  className={`group border-2 rounded-[2.5rem] p-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    paymentMethod === 'cod' 
                      ? 'border-blue-600 bg-white shadow-2xl shadow-blue-500/10' 
                      : 'border-white bg-white shadow-sm hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-8">
                    <div className={`p-6 rounded-3xl transition-all duration-300 ${
                      paymentMethod === 'cod' ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500'
                    }`}>
                      <Truck size={32} />
                    </div>
                    <div className="flex-grow space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cash on Delivery</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pay upon successful delivery</p>
                        </div>
                        {paymentMethod === 'cod' && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
                            <CheckCircle size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 uppercase tracking-widest">Available</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No extra convenience fee</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ONLINE PAYMENT OPTION */}
              <div 
                onClick={() => setPaymentMethod('online')} 
                className={`group border-2 rounded-[2.5rem] p-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                  paymentMethod === 'online' 
                    ? 'border-blue-600 bg-white shadow-2xl shadow-blue-500/10' 
                    : 'border-white bg-white shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-8">
                  <div className={`p-6 rounded-3xl transition-all duration-300 ${
                    paymentMethod === 'online' ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500'
                  }`}>
                    <CreditCard size={32} />
                  </div>
                  <div className="flex-grow space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Digital Settlement</h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Secure Online Gateway (UPI, Cards, NetBanking)</p>
                      </div>
                      {paymentMethod === 'online' && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
                          <CheckCircle size={14} />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 pt-2">
                      {[
                        { icon: Smartphone, label: 'Unified Payments (UPI)', color: 'text-purple-500' },
                        { icon: CreditCard, label: 'Credit / Debit Cards', color: 'text-blue-500' },
                        { icon: Banknote, label: 'Corporate Banking', color: 'text-emerald-500' },
                        { icon: Wallet, label: 'Digital Wallets', color: 'text-orange-500' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl bg-slate-50 ${item.color} shadow-sm border border-slate-100`}>
                            <item.icon size={16} />
                          </div>
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CREDIT OPTION */}
              {credit?.availableCredit > 0 && (
                <div 
                  onClick={() => setPaymentMethod(credit.availableCredit >= order.totalAmount ? 'credit' : 'hybrid')} 
                  className={`group border-2 rounded-[2.5rem] p-8 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    ['credit', 'hybrid'].includes(paymentMethod)
                      ? 'border-blue-600 bg-white shadow-2xl shadow-blue-500/10' 
                      : 'border-white bg-white shadow-sm hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-8">
                    <div className={`p-6 rounded-3xl transition-all duration-300 ${
                      ['credit', 'hybrid'].includes(paymentMethod) ? 'bg-blue-600 text-white shadow-2xl scale-110' : 'bg-slate-50 text-slate-400 group-hover:text-emerald-500'
                    }`}>
                      <Wallet size={32} />
                    </div>
                    <div className="flex-grow space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Business Credit Line</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Utilize approved enterprise credit</p>
                        </div>
                        {['credit', 'hybrid'].includes(paymentMethod) && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50">
                            <CheckCircle size={14} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between bg-slate-50 p-8 rounded-3xl border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Available Limit</p>
                          <p className="text-4xl font-black text-slate-900 tracking-tighter">₹{credit.availableCredit.toLocaleString()}</p>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Credit Status</p>
                          <span className="px-5 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-100">Approved</span>
                        </div>
                      </div>

                      {credit.availableCredit < order.totalAmount && (
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                            <Info size={20} />
                          </div>
                          <p className="text-[11px] font-black text-blue-700 leading-relaxed uppercase tracking-tight">
                            Credit insufficient for full total. Remaining balance will be settled online.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY PROTOCOL */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                  <div className="p-4 bg-white/10 rounded-2xl text-blue-400 backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                    <Lock size={28} />
                  </div>
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Enterprise Security Protocol</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      PCI-DSS Compliant Infrastructure • 256-bit AES Encryption • Zero-Trust Payment Architecture
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-12">
            <div className="bg-white rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
              <div className="bg-slate-900 p-10 md:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tight uppercase leading-tight">Order Summary</h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                      <QrCode size={14} className="text-blue-400" />
                      <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">TXN: #{orderId.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                    <FileText size={32} className="text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="p-10 md:p-12 space-y-12">
                <div className="space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <div className="flex justify-between items-center group">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Net Subtotal</span>
                    <span className="text-2xl font-bold text-slate-900">₹{(order.totalAmount / 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Wholesale Logistics</span>
                      <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-100">Free</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">₹0.00</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Final Amount Payable</p>
                      <p className="text-6xl md:text-7xl font-black text-blue-600 tracking-tighter leading-none">₹{order.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="self-start bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-xl shadow-blue-100">
                      Including 18% Corporate GST
                    </div>
                  </div>
                </div>

                {paymentMethod !== 'online' && paymentMethod !== 'cod' && (
                  <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Deduction</span>
                      <span className="text-xl font-black text-emerald-400">-₹{creditUsed.toLocaleString()}</span>
                    </div>
                    {onlinePayable > 0 && (
                      <div className="flex justify-between items-center pt-5 border-t border-white/10 relative z-10">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Balance Online</span>
                        <span className="text-3xl font-black text-white tracking-tight">₹{onlinePayable.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-6">
                  <button 
                    onClick={handlePayment} 
                    disabled={processing} 
                    className={`
                      w-full h-20 text-xl font-black rounded-3xl transition-all duration-300 transform active:scale-[0.98] uppercase tracking-[0.3em] flex items-center justify-center gap-4 group relative overflow-hidden
                      ${processing 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white shadow-[0_25px_50px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:shadow-[0_30px_60px_rgba(37,99,235,0.4)]'
                      }
                    `}
                  >
                    {processing ? (
                      <Loader2 className="animate-spin" size={32} />
                    ) : (
                      <>
                        {onlinePayable > 0 ? 'Secure Payment' : 'Confirm Order'}
                        <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-6">
                    By completing this transaction, you authorize Mokshith Enterprises to process your order under wholesale commerce regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
