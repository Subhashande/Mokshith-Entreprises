import { useOrder } from "../hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { routes } from "../../../routes/routeConfig";

const Checkout = () => {
  const { cart, placeOrder, clearCart } = useOrder();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    
    setLoading(true);
    try {
      await placeOrder({
        items: cart,
        total,
        userId: user?.id,
        address: "Default Business Address, Bangalore, India"
      });
      alert("Order placed successfully! Redirecting to orders...");
      clearCart();
      navigate(routes.ORDERS);
    } catch (err) {
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2 style={{ marginBottom: '1rem' }}>Your cart is empty</h2>
        <Button onClick={() => navigate(routes.PRODUCTS)}>Back to Catalog</Button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem' }}>Complete Your Order</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div>
            <Card style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Shipping Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="Full Name" defaultValue={user?.name} />
                <Input label="Phone" placeholder="+91 XXXXX XXXXX" />
              </div>
              <Input label="Business Address" defaultValue="123 Industrial Area, Phase II, Bangalore" />
            </Card>

            <Card>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Order Items</h3>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: '600' }}>{item.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Quantity: {item.quantity}</p>
                  </div>
                  <p style={{ fontWeight: '700' }}>₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <Card style={{ position: 'sticky', top: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Order Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>GST (18%)</span>
                <span>₹{tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: '1rem', marginBottom: '2rem' }}>
                <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>Total Amount</span>
                <span style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--primary)' }}>₹{total.toLocaleString()}</span>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Payment Method</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ flex: 1, border: '1px solid var(--primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--primary-light)' }}>
                    <input type="radio" name="payment" defaultChecked style={{ marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '700' }}>COD</span>
                  </label>
                  <label style={{ flex: 1, border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center', cursor: 'pointer' }}>
                    <input type="radio" name="payment" style={{ marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '700' }}>Credit</span>
                  </label>
                </div>
              </div>

              <Button 
                onClick={handlePlaceOrder} 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
