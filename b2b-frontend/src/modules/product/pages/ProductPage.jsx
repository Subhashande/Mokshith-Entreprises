import React, { useState, useMemo, useEffect } from "react";
import { useProduct } from "../hooks/useProduct";
import { useOrder } from "../../order/hooks/useOrder";
import { useAuth } from "../../auth/hooks/useAuth";
import ProductCard from "../components/ProductCard";
import Toast from "../../../components/feedback/Toast";
import Skeleton from "../../../components/feedback/Skeleton";
import apiClient from "../../../services/apiClient";
import { 
  Search, 
  ShoppingCart, 
  ArrowUpDown, 
  MapPin,
  Flame,
  Droplets,
  Wheat,
  Package,
  Coffee,
  Grape,
  Box,
  Wind,
  Sparkles,
  LayoutGrid
} from 'lucide-react';

const CATEGORY_ICONS = {
  'spices': Flame,
  'edible-oils': Droplets,
  'rice-pulses': Wheat,
  'atta-flour': Package,
  'beverages': Coffee,
  'dry-fruits': Grape,
  'packaging': Box,
  'cleaning': Wind,
  'staples': ShoppingCart,
  'snacks': Sparkles,
  'general': LayoutGrid
};

const ProductPage = () => {
  const { products, loading } = useProduct();
  const { addToCart } = useOrder();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [toast, setToast] = useState(null);
  const [backendCategories, setBackendCategories] = useState([]);

  // Fetch Categories from Backend API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories');
        const data = response.data || response;
        if (Array.isArray(data)) {
          setBackendCategories(data.filter(c => c.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Filter Categories to show only those with products
  const categories = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    const productsPerCat = products.reduce((acc, p) => {
      // Check category name, category slug, and category ID
      const catName = (p.category || p.categoryId?.name || 'general').toLowerCase();
      const catId = (p.categoryId?._id || p.categoryId || '').toString();
      
      acc[catName] = (acc[catName] || 0) + 1;
      if (catId) acc[catId] = (acc[catId] || 0) + 1;
      
      return acc;
    }, {});

    return backendCategories
      .map(cat => {
        const id = (cat._id || cat.id || '').toString();
        const name = (cat.name || '').toLowerCase();
        const slug = (cat.slug || '').toLowerCase();
        
        const count = productsPerCat[id] || productsPerCat[name] || productsPerCat[slug] || 0;
        
        return {
          id: cat._id || cat.id,
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase().replace(/ /g, '-'),
          count: count,
          icon: CATEGORY_ICONS[cat.slug?.toLowerCase()] || CATEGORY_ICONS[cat.name.toLowerCase()] || CATEGORY_ICONS['general']
        };
      })
      .filter(cat => cat.count > 0);
  }, [products, backendCategories]);

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const selectedCatLower = selectedCategory.toLowerCase();
        const productCatLower = (p.category || p.categoryId?.name || '').toLowerCase();
        const productCatSlug = (p.category || p.categoryId?.name || '').toLowerCase().replace(/ /g, '-');
        const productCatId = (p.categoryId?._id || p.categoryId || '').toString();

        const matchesCategory = selectedCategory === 'all' || 
          productCatLower === selectedCatLower ||
          productCatSlug === selectedCatLower ||
          productCatId === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        return 0;
      });
  }, [products, search, selectedCategory, sortBy]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setToast({ message: `${product.name} added to cart`, type: 'success' });
  };

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-[380px] rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* SEARCH BAR ROW - Static and pushes content down */}
      <div className="bg-white border-b border-slate-100 py-6">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search for products, brands, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold focus:outline-none focus:border-sky-600 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div className="relative shrink-0 w-full sm:w-auto">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold focus:outline-none appearance-none cursor-pointer min-w-[160px] shadow-sm"
              >
                <option value="default">Sort: Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* DYNAMIC SIDEBAR - Blinkit Style */}
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-[115px] lg:max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Categories</h2>
            </div>
            
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar p-2 lg:p-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 lg:w-full flex items-center justify-between px-5 py-3 lg:py-4 transition-all group border-b-2 lg:border-b-0 lg:border-r-4 rounded-xl lg:rounded-none ${
                  selectedCategory === 'all' 
                    ? 'bg-sky-50 border-sky-600 text-sky-600' 
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${selectedCategory === 'all' ? 'bg-sky-100' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                    <LayoutGrid size={18} className={selectedCategory === 'all' ? 'text-sky-600' : 'text-slate-400'} />
                  </div>
                  <span className={`text-[13px] font-bold whitespace-nowrap ${selectedCategory === 'all' ? 'text-sky-600' : 'text-slate-600'}`}>All Items</span>
                </div>
                <span className={`hidden lg:flex text-[10px] font-black px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {products?.length || 0}
                </span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug || cat.name)}
                  className={`flex-shrink-0 lg:w-full flex items-center justify-between px-5 py-3 lg:py-4 transition-all group border-b-2 lg:border-b-0 lg:border-r-4 rounded-xl lg:rounded-none ${
                    (selectedCategory === cat.slug || selectedCategory === cat.name)
                      ? 'bg-sky-50 border-sky-600 text-sky-600' 
                      : 'border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${(selectedCategory === cat.slug || selectedCategory === cat.name) ? 'bg-sky-100' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                      <cat.icon size={18} className={(selectedCategory === cat.slug || selectedCategory === cat.name) ? 'text-sky-600' : 'text-slate-400'} />
                    </div>
                    <span className={`text-[13px] font-bold whitespace-nowrap ${(selectedCategory === cat.slug || selectedCategory === cat.name) ? 'text-sky-600' : 'text-slate-600'}`}>{cat.name}</span>
                  </div>
                  <span className={`hidden lg:flex text-[10px] font-black px-2 py-0.5 rounded-full ${(selectedCategory === cat.slug || selectedCategory === cat.name) ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0">
            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product._id || product.id} 
                    product={product}
                    onAddToCart={handleAddToCart}
                    user={user}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-24 text-center border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No products found</h3>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Try adjusting your search or filters</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default ProductPage;
