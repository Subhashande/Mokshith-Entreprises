import React from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routeConfig';
import Button from '../ui/Button';
import Card from '../ui/Card';
import styles from './CartDrawer.module.css';

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
      className={styles.overlay}
      onClick={onClose}
    >
      <div 
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Your Shopping Cart</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.drawerContent}>
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}></p>
              <p className={styles.emptyText}>Your cart is empty</p>
              <Button onClick={onClose} variant="secondary" style={{ marginTop: '1rem' }}>Start Shopping</Button>
            </div>
          ) : (
            <div className={styles.cartItems}>
              {cart.map((item) => {
                const minQty = item.minOrderQty || item.moq || 1;
                const isItemMoqViolated = item.quantity < minQty;
                
                return (
                  <div key={item._id || item.id} className={styles.cartItem}>
                    <div className={styles.itemImage}>
                      
                    </div>
                    <div className={styles.itemDetails}>
                      <p className={styles.itemName}>{item.name}</p>
                      <div className={styles.itemPriceRow}>
                        <p className={styles.itemPrice}>₹{item.price.toLocaleString()}</p>
                        <span className={styles.itemMoq}>MOQ: {minQty}</span>
                      </div>
                      
                      <div className={styles.itemActions}>
                        <div className={styles.quantityControl}>
                          <button 
                            onClick={() => onUpdateQuantity(item._id || item.id, Math.max(1, item.quantity - 1))}
                            className={styles.quantityButton}
                          >
                            -
                          </button>
                          <span className={styles.quantityValue}>{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item._id || item.id, item.quantity + 1)}
                            className={styles.quantityButton}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          onClick={() => onRemoveItem(item._id || item.id)}
                          className={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                      
                      {isItemMoqViolated && (
                        <p className={styles.moqWarning}>
                           Minimum {minQty} required for wholesale
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
          <div className={styles.drawerFooter}>
            <div className={styles.subtotalRow}>
              <span className={styles.subtotalLabel}>Subtotal</span>
              <span className={styles.subtotalValue}>₹{subtotal.toLocaleString()}</span>
            </div>
            
            {isMoqViolated && (
              <div className={styles.moqAlert}>
                <p className={styles.moqAlertText}>
                  Some items do not meet the Minimum Order Quantity (MOQ). Please adjust quantities to proceed.
                </p>
              </div>
            )}

            <Button 
              onClick={() => {
                onClose();
                navigate(routes.CHECKOUT);
              }}
              className={styles.checkoutButton}
              disabled={cart.length === 0 || isMoqViolated}
            >
              {isMoqViolated ? 'MOQ Not Met' : 'Proceed to Checkout'}
            </Button>
            <p className={styles.footerNote}>
              Bulk shipping and taxes calculated at checkout
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
