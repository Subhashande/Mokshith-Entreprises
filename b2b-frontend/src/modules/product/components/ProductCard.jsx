import React, { useState, useEffect } from 'react';
import { ShoppingCart, Eye, Star, Plus, Minus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../routes/routeConfig';
import { useWishlist } from '../../../modules/wishlist/hooks/useWishlist';

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

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('📦')) return product.image;
    
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
      className="product-card premium-card"
      onClick={() => navigate(`${routes.PRODUCTS}/${product._id || product.id}`)}
    >
      <div className="product-image-wrapper">
        <img 
          src={getProductImage(product)} 
          alt={product.name} 
          className="product-image"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80"; }}
        />
        <div className="product-overlay">
          <button 
            className="overlay-button"
            onClick={(e) => { e.stopPropagation(); navigate(`${routes.PRODUCTS}/${product._id || product.id}`); }}
          >
            <Eye size={18} />
          </button>
          <button 
            className={`overlay-button ${inWishlist ? 'wishlist-active' : ''}`}
            onClick={handleWishlistToggle}
          >
            <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>
        {product.isNew && <span className="badge-new">New</span>}
      </div>

      <div className="product-info">
        <div className="product-meta">
          <span className="product-category">
            {product.category || product.categoryId?.name || "Wholesale"}
          </span>
          <div className="product-rating">
            <Star size={14} fill="var(--accent)" color="var(--accent)" />
            <span>{product.rating || 4.5}</span>
          </div>
        </div>
        
        <h3 className="product-title">{product.name}</h3>
        <p className="product-description">{product.description?.substring(0, 60)}...</p>
        
        <div className="wholesale-badge">
          <span>Minimum Order: {minQty} {product.unit || 'units'}</span>
        </div>

        <div className="product-footer">
          <div className="product-price-wrapper">
            <span className="price-label">Price per {product.unit || 'unit'}</span>
            <span className="product-price">
              ₹{product.price?.toLocaleString() || product.basePrice?.toLocaleString() || "0"}
            </span>
          </div>
          
          <div className="quantity-selector-inline">
            <button onClick={handleDecrease} className="qty-btn" title="Decrease">
              <Minus size={16} strokeWidth={3} />
            </button>
            <span className="qty-val">{qty}</span>
            <button onClick={handleIncrease} className="qty-btn" title="Increase">
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="product-actions-full">
          <button 
            className="add-to-cart-btn-full"
            onClick={(e) => handleAction(e, onAddToCart)}
          >
            <ShoppingCart size={18} /> Add
          </button>
          <button 
            className="buy-now-btn-full"
            onClick={(e) => handleAction(e, onBuyNow)}
          >
            Buy Now
          </button>
        </div>
      </div>

      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          transition: all 0.3s ease;
          overflow: hidden;
          cursor: pointer;
          position: relative;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-light);
        }

        .product-image-wrapper {
          position: relative;
          height: 180px;
          overflow: hidden;
          background: #f8fafc;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.1);
        }

        .product-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .product-card:hover .product-overlay {
          opacity: 1;
        }

        .overlay-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          color: var(--text-main);
          box-shadow: var(--shadow-md);
          transition: all 0.2s ease;
        }

        .overlay-button:hover {
          transform: scale(1.1);
          background: var(--primary);
          color: white;
        }

        .wishlist-active {
          color: #ef4444;
        }

        .wishlist-active:hover {
          background: #ef4444;
          color: white;
        }

        .badge-new {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--accent);
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .product-info {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .product-category {
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .product-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-description {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .wholesale-badge {
          background: #eff6ff;
          color: #1e40af;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 1rem;
          border: 1px dashed #bfdbfe;
        }

        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          margin-bottom: 1rem;
        }

        .product-price-wrapper {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .product-price {
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .quantity-selector-inline {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border-radius: 20px;
          padding: 4px;
          gap: 12px;
        }

        .qty-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #1e293b;
          transition: all 0.2s ease;
        }

        .qty-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #2563eb;
        }

        .qty-btn:active {
          transform: scale(0.95);
        }

        .qty-val {
          font-weight: 700;
          font-size: 0.875rem;
          min-width: 20px;
          text-align: center;
        }

        .product-actions-full {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .add-to-cart-btn-full, .buy-now-btn-full {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.625rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .add-to-cart-btn-full {
          background: var(--primary-light);
          color: var(--primary);
        }

        .add-to-cart-btn-full:hover {
          background: var(--primary);
          color: white;
        }

        .buy-now-btn-full {
          background: var(--primary);
          color: white;
        }

        .buy-now-btn-full:hover {
          background: var(--primary-dark);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
