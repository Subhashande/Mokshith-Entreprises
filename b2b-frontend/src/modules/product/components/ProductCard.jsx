import { useState, useEffect, memo } from 'react';
import { ShoppingCart, Heart, Clock, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routes } from '../../../routes/routeConfig.js';
import { useWishlist } from '../../../modules/wishlist/hooks/useWishlist.js';
import { getProductImage } from '../../../utils/imageHelper.js';

const ProductCard = ({ product, onAddToCart, user }) => {
  const navigate = useNavigate();
  const minQty = product.moq || product.minOrderQty || 1;
  const [qty, setQty] = useState(minQty);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product._id || product.id);

  useEffect(() => {
    setQty(product.moq || product.minOrderQty || 1);
  }, [product]);

  const handleAction = (e, action) => {
    e.stopPropagation();
    if (!user) {
      navigate(routes.LOGIN, { state: { from: window.location.pathname } });
      return;
    }
    action({ ...product, quantity: qty });
  };

  const handleQtyChange = (e, delta) => {
    e.stopPropagation();
    const newQty = qty + delta;
    if (newQty >= minQty) {
      setQty(newQty);
    }
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate(routes.LOGIN, { state: { from: window.location.pathname } });
      return;
    }
    if (inWishlist) {
      await removeFromWishlist(product._id || product.id);
    } else {
      await addToWishlist(product._id || product.id);
    }
  };

  // Removed fake brand extraction logic
  const productName = product.name;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-visible hover:shadow-xl hover:shadow-sky-500/5 transition-all group cursor-pointer flex flex-col h-full relative"
      onClick={() => navigate(`${routes.PRODUCTS}/${product._id || product.id}`)}
    >
      {/* Wishlist Button - Ensure overflow-visible on parent to prevent clipping */}
      <button 
        className={`absolute -top-2 -right-2 p-2.5 rounded-full transition-all z-30 shadow-lg ${
          inWishlist ? 'text-rose-500 bg-white' : 'text-slate-300 bg-white hover:bg-white hover:text-rose-500'
        }`}
        onClick={handleWishlistToggle}
      >
        <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
      </button>

      {/* Image Wrapper */}
      <div className="relative aspect-square bg-white p-4 overflow-hidden flex items-center justify-center group-hover:bg-slate-50/50 transition-colors rounded-t-2xl">
        <img 
          src={getProductImage(product)} 
          alt={product.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e) => { 
            // Better fallback based on product name
            const name = product.name.toLowerCase();
            let fallback = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"; // Default shelf
            
            if (name.includes('rice')) fallback = "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800";
            else if (name.includes('dal') || name.includes('pulse')) fallback = "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=800";
            else if (name.includes('oil')) fallback = "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800";
            else if (name.includes('atta') || name.includes('flour')) fallback = "https://images.unsplash.com/photo-1627485601819-747ee16fdb76?auto=format&fit=crop&q=80&w=800";
            else if (name.includes('spice') || name.includes('powder')) fallback = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800";
            
            e.target.src = fallback; 
          }}
        />
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        {/* Delivery Time Badge */}
        <div className="flex items-center gap-1.5 text-[#16A34A] mb-1.5">
          <Clock size={12} className="fill-[#16A34A]/10" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {product.deliveryTime || '8 mins'}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-[14px] font-bold text-[#111827] line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors min-h-[40px]">
            {productName}
          </h3>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {product.unit || product.weight || '1 unit'}
          </p>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[16px] font-black text-[#111827]">₹{product.price}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="text-[10px] font-bold text-slate-400 line-through">₹{product.mrp}</span>
            )}
          </div>

          {qty > minQty ? (
            <div className="flex items-center bg-sky-600 rounded-xl p-1 shadow-lg shadow-sky-900/10">
              <button 
                onClick={(e) => handleQtyChange(e, -1)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-sky-700 rounded-lg transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-[12px] font-black text-white">{qty}</span>
              <button 
                onClick={(e) => handleQtyChange(e, 1)}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-sky-700 rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button 
              onClick={(e) => handleAction(e, onAddToCart)}
              className="px-6 py-2 bg-white border border-sky-600 text-sky-600 text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-sky-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(ProductCard);
