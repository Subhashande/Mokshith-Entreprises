import { useOrder } from "../hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";
import { PAYMENT_METHODS } from "../../../utils/constants";
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  Package, 
  ShieldCheck, 
  ArrowRight,
  Info,
  ChevronRight,
  Wallet
} from "lucide-react";

const Checkout = () => {
  const { cart, placeOrder } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.COD);
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: ""
  });

  const subtotal = cart.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress({ ...address, [name]: value });
  };

  const validateCheckout = () => {
    const newErrors = {};
    
    if (cart.length === 0) {
      newErrors.cart = "Your cart is empty!";
      setErrors(newErrors);
      return false;
    }

    const requiredFields = ['name', 'phone', 'addressLine', 'city', 'state', 'pincode'];
    const missingFields = requiredFields.filter(f => !address[f]?.trim());
    
    if (missingFields.length > 0) {
      missingFields.forEach(field => {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      });
      newErrors.form = `Please fill in all required fields: ${missingFields.join(', ')}`;
      setErrors(newErrors);
      return false;
    }

    const moqViolations = cart.filter(item => {
      const minQty = item.minOrderQty || item.moq || 1;
      return item.quantity < minQty;
    });

    if (moqViolations.length > 0) {
      const names = moqViolations.map(item => item.name).join(', ');
      newErrors.moq = `Minimum Order Quantity not met for: ${names}. Please adjust in cart.`;
      setErrors(newErrors);
      return false;
    }

    if (paymentMethod === PAYMENT_METHODS.CREDIT) {
      if (!user?.availableCredit || user.availableCredit < total) {
        newErrors.payment = "Insufficient credit balance. Please choose another payment method.";
        setErrors(newErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateCheckout()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        items: cart.map(item => ({
          productId: item.id || item._id,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        totalAmount: total,
        paymentMethod,
        shippingAddress: address
      };

      const response = await placeOrder(payload);
      const newOrder = response.data || response;
      
      navigate(routes.PAYMENT.replace(':orderId', newOrder._id));
    } catch (err) {
      console.error("Checkout Error:", err);
      setErrors({ form: err.message || "Failed to place order. Please check your connection and try again." });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300 shadow-inner">
          <Package size={48} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Your cart is empty</h2>
        <p className="text-gray-500 font-bold mb-8">Add some products to get started!</p>
        <Button 
          onClick={() => navigate(routes.PRODUCTS)}
          className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-100 transition-all transform hover:-translate-y-1"
        >
          Back to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
              Finalize <span className="text-blue-600">Checkout</span>
            </h1>
            <p className="text-gray-500 font-bold mt-3 flex items-center gap-2 text-lg">
              <ShieldCheck size={22} className="text-emerald-500" />
              Secure Business Transaction
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-black text-gray-400 uppercase tracking-widest bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-50">
            <span>Cart</span>
            <ChevronRight size={16} />
            <span className="text-blue-600">Checkout</span>
            <ChevronRight size={16} />
            <span>Payment</span>
          </div>
        </div>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <div 
            className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl mb-6" 
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <Info size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-red-900 mb-2">Please fix the following errors:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-10 rounded-[3rem] border-none shadow-sm bg-white border border-gray-50">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Shipping Details</h3>
                  <p className="text-sm font-bold text-gray-400">Where should we deliver your order?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <Input 
                  label="Business / Contact Name" 
                  name="name" 
                  value={address.name} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
                <Input 
                  label="Contact Phone" 
                  name="phone" 
                  placeholder="+91 XXXXX XXXXX" 
                  value={address.phone} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-8">
                <Input 
                  label="Detailed Address Line" 
                  name="addressLine" 
                  value={address.addressLine} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Input 
                  label="City" 
                  name="city" 
                  value={address.city} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
                <Input 
                  label="State" 
                  name="state" 
                  value={address.state} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
                <Input 
                  label="Pincode" 
                  name="pincode" 
                  value={address.pincode} 
                  onChange={handleAddressChange} 
                  required 
                  className="rounded-2xl border-gray-100 focus:border-blue-500"
                />
              </div>
            </Card>

            <Card className="p-10 rounded-[3rem] border-none shadow-sm bg-white border border-gray-50">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Order Items</h3>
                  <p className="text-sm font-bold text-gray-400">Review your wholesale selection</p>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {cart.map((item, index) => (
                  <div key={item._id || item.id || index} className="flex items-center justify-between py-6 group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 border border-gray-100 overflow-hidden">
                        <img 
                          src={item.image || "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=100&q=80"} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{item.name}</p>
                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Qty: {item.quantity} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">₹{item.price}/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white border border-gray-50 sticky top-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Subtotal</span>
                  <span className="text-lg font-black text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tax (18% GST)</span>
                  <span className="text-lg font-black text-gray-900">₹{tax.toLocaleString()}</span>
                </div>
                <div className="pt-6 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                  <span className="text-base font-black text-gray-900 uppercase tracking-widest">Total Amount</span>
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">₹{total.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Payment Method</p>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg">
                    <Wallet size={12} className="text-blue-600" />
                    <span className="text-[10px] font-black text-blue-700">₹{user?.availableCredit?.toLocaleString() || '0'} Credit</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: PAYMENT_METHODS.COD, label: 'COD', icon: Truck },
                    { id: PAYMENT_METHODS.CREDIT, label: 'Credit', icon: Wallet, disabled: (user?.availableCredit || 0) < total },
                    { id: PAYMENT_METHODS.RAZORPAY, label: 'Razorpay', icon: CreditCard },
                    { id: PAYMENT_METHODS.ONLINE, label: 'Online', icon: ShieldCheck },
                  ].map((method) => (
                    <button
                      key={method.id}
                      disabled={method.disabled}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2
                        ${paymentMethod === method.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100/50' 
                          : 'border-gray-50 bg-gray-50/30 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                        }
                        ${method.disabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                      `}
                    >
                      <method.icon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handlePlaceOrder} 
                className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-2xl shadow-blue-200 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
                loading={loading}
                disabled={loading}
              >
                Place Secure Order
                <ArrowRight size={20} />
              </Button>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-wider">
                  By placing this order, you agree to our wholesale terms of service and business purchase policy.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
