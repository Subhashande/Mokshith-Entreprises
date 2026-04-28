import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Eye, Star, Plus, Minus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../routes/routeConfig';
import { useWishlist } from '../../../modules/wishlist/hooks/useWishlist';
import styles from './ProductCard.module.css';

const ProductCard = ({ product, onAddToCart, onBuyNow, user }) => {
  const navigate = useNavigate();
  const minQty = product.minOrderQty || product.moq || 1;
  const [qty, setQty] = useState(minQty);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product._id || product.id);

  // Sync qty with product minQty if product changes
  useEffect(() => {
    setQty(product.minOrderQty || product.moq || 1);
  }, [product]);

  const productImage = useMemo(() => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('')) return product.image;
    
    const category = (product.category || product.categoryId?.name || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    
    if (category.includes('rice') || name.includes('rice'))
      return "https://images.unsplash.com/photo-1586201327693-86750f72332e?auto=format&fit=crop&w=500&q=80";
    if (category.includes('dal') || name.includes('dal') || category.includes('pulse'))
      return "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&w=500&q=80";
    if (category.includes('oil') || name.includes('oil'))
      return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80";
    if (category.includes('sugar') || name.includes('sugar') || category.includes('salt'))
      return "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=80";
    
    return "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80";
  }, [product]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`${routes.PRODUCTS}/${product._id || product.id}`);
    }
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    if (!user) {
      navigate(routes.LOGIN, { state: { from: window.location.pathname } });
      return;
    }
    if (qty < minQty) {
      alert(`Minimum ${minQty} quantity required`);
      return;
    }
    action({ ...product, quantity: qty });
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    if (qty > minQty) {
      setQty(prev => prev - 1);
    }
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    setQty(prev => prev + 1);
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate(routes.LOGIN, { state: { from: window.location.pathname } });
      return;
    }
    try {
      if (inWishlist) {
        await removeFromWishlist(product._id || product.id);
      } else {
        await addToWishlist(product._id || product.id);
      }
    } catch (err) {
      console.error('Wishlist error:', err);
    }
  };

  return (
    <div 
      className={styles.card}
      onClick={() => navigate(`${routes.PRODUCTS}/${product._id || product.id}`)}
      onKeyPress={handleKeyPress}
      role="article"
      tabIndex={0}
      aria-label={`${product.name}, ${product.category || 'product'}, ₹${product.price}`}
    >
      <div className={styles.imageWrapper}>
        <img 
          src={productImage} 
          alt={`${product.name} - ${product.category || 'product'}`}
          className={styles.image}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80"; }}
        />
        <div className={styles.overlay}>
          <button 
            className={styles.overlayButton}
            onClick={(e) => { e.stopPropagation(); navigate(`${routes.PRODUCTS}/${product._id || product.id}`); }}
            aria-label="View product details"
          >
            <Eye size={18} aria-hidden="true" />
          </button>
          <button 
            className={`${styles.overlayButton} ${inWishlist ? styles.wishlistActive : ''}`}
            onClick={handleWishlistToggle}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={inWishlist}
          >
            <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </div>
        {product.isNew && <span className={styles.badgeNew}>New</span>}
      </div>

      <div className={styles.info}>
        <div className={styles.meta}>
          <span className={styles.category}>
            {product.category || product.categoryId?.name || "Wholesale"}
          </span>
          <div className={styles.rating} aria-label={`Rating: ${product.rating || 4.5} out of 5`}>
            <Star size={14} fill="var(--accent)" color="var(--accent)" aria-hidden="true" />
            <span>{product.rating || 4.5}</span>
          </div>
        </div>
        
        <h3 className={styles.title}>{product.name}</h3>
        <p className={styles.description}>{product.description?.substring(0, 60)}...</p>
        
        <div className={styles.wholesaleBadge}>
          <span>Minimum Order: {minQty} {product.unit || 'units'}</span>
        </div>

        <div className={styles.footer}>
          <div className={styles.priceWrapper}>
            <span className={styles.priceLabel}>Price per {product.unit || 'unit'}</span>
            <span className={styles.price}>
              ₹{product.price?.toLocaleString() || product.basePrice?.toLocaleString() || "0"}
            </span>
          </div>
          
          <div className={styles.quantitySelector} role="group" aria-label="Quantity selector">
            <button 
              onClick={handleDecrease} 
              className={styles.qtyBtn} 
              aria-label="Decrease quantity"
              disabled={qty <= minQty}
            >
              <Minus size={16} strokeWidth={3} aria-hidden="true" />
            </button>
            <span className={styles.qtyVal} aria-live="polite">{qty}</span>
            <button 
              onClick={handleIncrease} 
              className={styles.qtyBtn} 
              aria-label="Increase quantity"
            >
              <Plus size={16} strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.btnAddToCart}
            onClick={(e) => handleAction(e, onAddToCart)}
            aria-label={`Add ${qty} ${product.unit || 'units'} of ${product.name} to cart`}
          >
            <ShoppingCart size={18} aria-hidden="true" /> Add
          </button>
          <button 
            className={styles.btnBuyNow}
            onClick={(e) => handleAction(e, onBuyNow)}
            aria-label={`Buy ${qty} ${product.unit || 'units'} of ${product.name} now`}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
