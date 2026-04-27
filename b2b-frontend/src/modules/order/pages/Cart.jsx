import { useOrder } from "../hooks/useOrder";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Truck
} from "lucide-react";
import { routes } from "../../../routes/routeConfig";

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useOrder();
  const navigate = useNavigate();

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-gray-100">
          <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 max-w-xs text-center">Looks like you haven't added any products to your inventory yet.</p>
        <Button 
          onClick={() => navigate(routes.PRODUCTS)} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold"
        >
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shopping Cart</h1>
            <p className="text-gray-500 font-medium">Review your items before proceeding to checkout.</p>
          </div>
          <button 
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 font-bold text-sm flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-all"
          >
            <Trash2 size={16} />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <Card key={item._id || item.id} className="p-6 border-none shadow-sm rounded-[2rem] bg-white group">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 border border-gray-100 group-hover:scale-105 transition-transform">
                    <ShoppingBag size={32} />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm font-medium text-gray-400 mb-4">Unit Price: ₹{item.price.toLocaleString()}</p>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                      <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                        <button 
                          onClick={() => updateQuantity(item._id || item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-10 text-center font-bold text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id || item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item._id || item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-black text-blue-600 tracking-tight">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}

            <button 
              onClick={() => navigate(routes.PRODUCTS)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold py-4 px-2 transition-colors group"
            >
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Continue Shopping
            </button>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-8 border-none shadow-lg shadow-blue-50/50 rounded-[2.5rem] bg-white">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>GST (18%)</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Shipping</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Investment</p>
                    <p className="text-3xl font-black text-blue-600 tracking-tight">₹{total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => navigate(routes.CHECKOUT)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-200 transition-all hover:scale-[1.02]"
              >
                Proceed to Checkout
                <ArrowRight size={20} />
              </Button>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-gray-500">
                  <ShieldCheck size={20} className="text-green-500" />
                  <span className="text-sm font-medium">Secure B2B Transaction</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <Truck size={20} className="text-blue-500" />
                  <span className="text-sm font-medium">Fast Business Delivery</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm rounded-3xl bg-blue-50 border border-blue-100">
              <p className="text-sm font-medium text-blue-800 leading-relaxed">
                <span className="font-bold">Pro Tip:</span> Orders above ₹50,000 qualify for additional 5% credit line extension.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
