import React, { useState } from 'react';
import { useWishlist } from '../hooks/useWishlist';
import { useOrder } from '../../order/hooks/useOrder';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { 
  Heart, 
  Trash2, 
  ShoppingCart, 
  ArrowRight,
  Package,
  Star,
  ShoppingBag,
  Zap,
  Truck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../../routes/routeConfig';

const WishlistPage = () => {
  const { wishlist, loading, error, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useOrder();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState({});
  const [isClearing, setIsClearing] = useState(false);

  const safeItems = Array.isArray(wishlist?.items) ? wishlist.items : [];

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire wishlist?")) return;
    try {
      setIsClearing(true);
      await clearWishlist();
    } catch (err) {
      console.error("Failed to clear wishlist:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('')) return product.image;
    
    const category = (product.category?.name || product.categoryId?.name || "").toLowerCase();
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

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting[product._id]) return;
    
    try {
      setIsSubmitting(prev => ({ ...prev, [product._id]: true }));
      await addToCart({
        ...product,
        quantity: product.minOrderQty || 1
      });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [product._id]: false }));
    }
  };

  const handleRemove = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting[productId]) return;
    
    try {
      setIsSubmitting(prev => ({ ...prev, [productId]: true }));
      await removeFromWishlist(productId);
    } finally {
      setIsSubmitting(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading && !safeItems.length) {
    return (
      <div className="p-8 bg-gray-50/50 min-h-screen">
        <div className="mb-10 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 rounded-2xl mb-3"></div>
          <div className="h-5 w-96 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-white rounded-[2rem] shadow-sm animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Heart size={40} className="text-red-500 fill-red-500" />
            My <span className="text-red-500">Wishlist</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
            <ShoppingBag size={18} className="text-gray-400" />
            {safeItems.length} {safeItems.length === 1 ? 'product' : 'products'} saved for your next order
          </p>
        </div>
        <div className="flex gap-4">
          {safeItems.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleClearAll}
                loading={isClearing}
                disabled={isClearing}
                className="h-14 px-6 rounded-2xl flex items-center gap-2 border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-all font-black"
              >
                <Trash2 size={20} />
                Clear All
              </Button>
              <Link to={routes.PRODUCTS}>
                <Button variant="secondary" className="h-14 px-8 rounded-2xl flex items-center gap-2 shadow-sm font-black border-2 border-gray-100 hover:bg-gray-50 transition-all">
                  Continue Shopping
                  <ArrowRight size={20} />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {error && (
        <Card className="mb-8 border-red-100 bg-red-50/50 p-6 rounded-2xl">
          <div className="flex items-center gap-3 text-red-600 font-black">
            <Zap size={20} />
            {error}
          </div>
        </Card>
      )}

      {safeItems.length === 0 ? (
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="text-center py-24 border-2 border-dashed border-gray-200 bg-white/50 rounded-[3rem]">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Heart size={64} className="text-gray-300" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Your Wishlist is Empty</h2>
            <p className="text-gray-500 font-bold max-w-sm mx-auto mb-12 text-lg leading-relaxed">
              Found something you like? Add it to your wishlist and we'll keep it safe for you.
            </p>
            <Link to={routes.PRODUCTS}>
              <Button className="h-16 px-16 rounded-2xl text-xl font-black shadow-2xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:-translate-y-1">
                Explore Products
              </Button>
            </Link>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {safeItems.map((item) => {
            const product = item.productId || item.product || item;
            if (!product || !product._id) return null;
            const subId = product._id;

            return (
              <Card 
                key={item._id} 
                className="group relative overflow-hidden flex flex-col h-full bg-white border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] border border-gray-50"
                onClick={() => navigate(`${routes.PRODUCTS}/${product._id}`)}
              >
                <button 
                  onClick={(e) => handleRemove(e, product._id)}
                  disabled={isSubmitting[subId]}
                  className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-xl shadow-lg rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 border border-gray-100 disabled:opacity-50 group-hover:scale-110 active:scale-90"
                  title="Remove from Wishlist"
                >
                  <Trash2 size={20} strokeWidth={2.5} />
                </button>
                
                <div className="aspect-square p-6 bg-gray-50/50 rounded-[2rem] overflow-hidden relative m-4 mb-0 transition-colors group-hover:bg-gray-100/50">
                  <img 
                    src={getProductImage(product)} 
                    alt={product.name} 
                    className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform duration-700 ease-out"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80"; }}
                  />
                  {product.discount > 0 && (
                    <div className="absolute bottom-6 left-6 px-4 py-2 bg-red-500 text-white text-xs font-black rounded-xl shadow-xl shadow-red-200">
                      -{product.discount}% OFF
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] bg-blue-50 px-3 py-1 rounded-full">
                      {product.category?.name || product.categoryId?.name || 'General'}
                    </span>
                    <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-50/50 px-3 py-1 rounded-full">
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-black text-yellow-700">{product.ratings || '4.5'}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-6 leading-tight tracking-tight">
                    {product.name}
                  </h3>

                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2.5 mb-8">
                      <span className="text-3xl font-black text-gray-900 tracking-tight">₹{product.price?.toLocaleString()}</span>
                      {product.oldPrice && (
                        <span className="text-base font-bold text-gray-400 line-through decoration-red-400/30">₹{product.oldPrice?.toLocaleString()}</span>
                      )}
                    </div>

                    <Button 
                      className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl font-black shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:-translate-y-1 active:scale-95"
                      onClick={(e) => handleAddToCart(e, product)}
                      loading={isSubmitting[subId]}
                      disabled={isSubmitting[subId]}
                    >
                      <ShoppingCart size={20} strokeWidth={2.5} />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 transition-all hover:bg-blue-50">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
            <Truck size={24} />
          </div>
          <h3 className="font-black text-blue-900 mb-2 text-xl tracking-tight">Free Express Delivery</h3>
          <p className="text-sm font-bold text-blue-700/70 leading-relaxed">
            Wishlist items qualify for free priority shipping on orders over ₹5,000.
          </p>
        </div>
        <div className="p-8 bg-purple-50/50 rounded-[2.5rem] border border-purple-100 transition-all hover:bg-purple-50">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
            <Zap size={24} />
          </div>
          <h3 className="font-black text-purple-900 mb-2 text-xl tracking-tight">Price Drop Alerts</h3>
          <p className="text-sm font-bold text-purple-700/70 leading-relaxed">
            Get instant notifications when prices drop on your saved products.
          </p>
        </div>
        <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 transition-all hover:bg-emerald-50">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
            <Package size={24} />
          </div>
          <h3 className="font-black text-emerald-900 mb-2 text-xl tracking-tight">Bulk Availability</h3>
          <p className="text-sm font-bold text-emerald-700/70 leading-relaxed">
            Real-time stock monitoring for large quantity business requirements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;