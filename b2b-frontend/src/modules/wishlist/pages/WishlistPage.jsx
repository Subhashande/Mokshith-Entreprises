import React from 'react';
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
  Star
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../../routes/routeConfig';

const WishlistPage = () => {
  const { wishlist, loading, error, removeFromWishlist } = useWishlist();
  const { addToCart } = useOrder();
  const navigate = useNavigate();
  const safeItems = Array.isArray(wishlist?.items) ? wishlist.items : [];

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) return product.images[0];
    if (product.image && !product.image.includes('📦')) return product.image;
    
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

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      ...product,
      quantity: product.minOrderQty || 1
    });
  };

  if (loading && !safeItems.length) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart size={28} className="text-red-500 fill-red-500" />
          My Wishlist
        </h1>
        <p className="text-gray-500 mt-1">Products you've saved for later</p>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {safeItems.length === 0 ? (
        <Card className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={40} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Explore our collection and save items you like to find them easily later.
          </p>
          <Link to="/products">
            <Button className="flex items-center gap-2 mx-auto px-8">
              Start Shopping
              <ArrowRight size={18} />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {safeItems.map((item) => {
            const product = item.productId || item.product || item;
            if (!product || !product._id) return null;

            return (
              <Card 
                key={item._id} 
                className="group relative overflow-hidden flex flex-col h-full cursor-pointer"
                onClick={() => navigate(`${routes.PRODUCTS}/${product._id}`)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWishlist(product._id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 transition-colors z-10 shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
                
                <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden relative">
                  <img 
                    src={getProductImage(product)} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=500&q=80"; }}
                  />
                  {product.discount > 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                      -{product.discount}%
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {product.category?.name || product.categoryId?.name || 'Category'}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-bold text-gray-600">{product.ratings || '4.5'}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xl font-black text-gray-900">₹{product.price}</span>
                      {product.oldPrice && (
                        <span className="text-sm text-gray-400 line-through">₹{product.oldPrice}</span>
                      )}
                    </div>

                    <Button 
                      className="w-full flex items-center justify-center gap-2 py-2.5"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      <ShoppingCart size={18} />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-2">Free Delivery</h3>
          <p className="text-sm text-blue-700">On all wishlist items when you order above ₹5000.</p>
        </div>
        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
          <h3 className="font-bold text-purple-900 mb-2">Price Drop Alerts</h3>
          <p className="text-sm text-purple-700">We'll notify you when items in your wishlist go on sale.</p>
        </div>
        <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
          <h3 className="font-bold text-green-900 mb-2">Exclusive Access</h3>
          <p className="text-sm text-green-700">Wishlist members get early access to flash sales.</p>
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;