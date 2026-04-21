import React from 'react';
import { ShoppingCart, Eye, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../../routes/routeConfig';

const ProductCard = ({ product, onAddToCart, onBuyNow, user }) => {
  const navigate = useNavigate();

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('📦')) return product.image;
    
    const category = (product.category || product.categoryId?.name || "").toLowerCase();
    if (category.includes('laptop') || category.includes('electronics')) 
      return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80";
    if (category.includes('phone') || category.includes('mobile'))
      return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80";
    
    return "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80";
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    if (!user) {
      navigate(routes.LOGIN, { state: { from: window.location.pathname } });
      return;
    }
    action(product);
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
        </div>
        {product.isNew && <span className="badge-new">New</span>}
      </div>

      <div className="product-info">
        <div className="product-meta">
          <span className="product-category">
            {product.category || product.categoryId?.name || "General"}
          </span>
          <div className="product-rating">
            <Star size={14} fill="var(--accent)" color="var(--accent)" />
            <span>{product.rating || 4.5}</span>
          </div>
        </div>
        
        <h3 className="product-title">{product.name}</h3>
        <p className="product-description">{product.description?.substring(0, 60)}...</p>
        
        <div className="product-footer">
          <div className="product-price-wrapper">
            <span className="price-label">Starting at</span>
            <span className="product-price">
              ₹{product.price?.toLocaleString() || product.basePrice?.toLocaleString() || "0"}
            </span>
          </div>
          
          <div className="product-actions">
            <button 
              className="add-to-cart-btn"
              onClick={(e) => handleAction(e, onAddToCart)}
              title="Add to Cart"
            >
              <ShoppingCart size={18} />
            </button>
            <button 
              className="buy-now-btn"
              onClick={(e) => handleAction(e, onBuyNow)}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--surface);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
        }

        .product-image-wrapper {
          position: relative;
          height: 200px;
          background-color: #f8fafc;
          overflow: hidden;
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .product-card:hover .product-image {
          transform: scale(1.05);
        }

        .product-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
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
          background: white;
          border: none;
          padding: 0.75rem;
          border-radius: 50%;
          color: var(--text-main);
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }

        .overlay-button:hover {
          transform: scale(1.1);
          color: var(--primary);
        }

        .badge-new {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background-color: var(--success);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .product-info {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .product-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .product-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .product-description {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .product-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
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
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .product-actions {
          display: flex;
          gap: 0.5rem;
        }

        .add-to-cart-btn {
          padding: 0.625rem;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: white;
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .add-to-cart-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background-color: var(--primary-light);
        }

        .buy-now-btn {
          padding: 0.625rem 1rem;
          border-radius: var(--radius-md);
          border: none;
          background-color: var(--primary);
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .buy-now-btn:hover {
          background-color: var(--primary-hover);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  );
};

export default ProductCard;