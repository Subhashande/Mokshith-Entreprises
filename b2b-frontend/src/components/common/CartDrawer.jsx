import React from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';
import Card from '../ui/Card';

const CartDrawer = ({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem }) => {
  const navigate = useNavigate();
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const isMoqViolated = cart.some(item => {
    const minQty = item.minOrderQty || item.moq || 1;
    return item.quantity < minQty;
  });

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          width: '100%', maxWidth: '400px', backgroundColor: 'white', 
          height: '100%', display: 'flex', flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Your Shopping Cart</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</p>
              <p style={{ color: 'var(--text-muted)' }}>Your cart is empty</p>
              <Button onClick={onClose} variant="secondary" style={{ marginTop: '1rem' }}>Start Shopping</Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {cart.map((item) => {
                const minQty = item.minOrderQty || item.moq || 1;
                const isItemMoqViolated = item.quantity < minQty;
                
                return (
                  <div key={item._id || item.id} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      📦
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.name}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <p style={{ color: 'var(--primary)', fontWeight: '700', margin: 0 }}>₹{item.price.toLocaleString()}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MOQ: {minQty}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '0.25rem' }}>
                          <button 
                            onClick={() => onUpdateQuantity(item._id || item.id, Math.max(1, item.quantity - 1))}
                            style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ padding: '0 0.5rem', fontSize: '0.875rem' }}>{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item._id || item.id, item.quantity + 1)}
                            style={{ padding: '0.25rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          onClick={() => onRemoveItem(item._id || item.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Remove
                        </button>
                      </div>
                      
                      {isItemMoqViolated && (
                        <p style={{ color: 'var(--error)', fontSize: '0.7rem', marginTop: '0.5rem', fontWeight: '600' }}>
                          ⚠️ Minimum {minQty} required for wholesale
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: '600' }}>Subtotal</span>
              <span style={{ fontWeight: '800', fontSize: '1.25rem' }}>₹{subtotal.toLocaleString()}</span>
            </div>
            
            {isMoqViolated && (
              <div style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <p style={{ color: '#c53030', fontSize: '0.75rem', fontWeight: '600', margin: 0 }}>
                  Some items do not meet the Minimum Order Quantity (MOQ). Please adjust quantities to proceed.
                </p>
              </div>
            )}

            <Button 
              onClick={() => {
                if (isMoqViolated) {
                  alert("Please fix MOQ violations before checking out.");
                  return;
                }
                onClose();
                navigate(routes.CHECKOUT);
              }}
              style={{ width: '100%', padding: '1rem' }}
              disabled={isMoqViolated}
            >
              Proceed to Checkout
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
              Bulk shipping and taxes calculated at checkout
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CartDrawer;
