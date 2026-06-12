import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  Package, 
  Wallet, 
  ShoppingBag, 
  TrendingUp, 
  Truck, 
  ChevronRight, 
  ArrowRight,
  Star,
  Plus,
  Clock,
  LayoutGrid,
  Heart,
  Headphones,
  RotateCcw,
  Zap,
  Tag,
  Percent,
  Flame,
  Award,
  ChevronLeft,
  Phone,
  ShoppingCart,
  Boxes
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useOrder } from '../../order/hooks/useOrder.js';
import { useProduct } from '../hooks/useProduct.js';
import { useCredit } from '../../credit/hooks/useCredit.js';
import { routes } from '../../../routes/routeConfig.js';
import Skeleton from '../../../components/feedback/Skeleton.jsx';
import { getProductImage, getCategoryImage } from '../../../utils/imageHelper.js';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, allProducts, categories, loading: productsLoading, categoriesLoading } = useProduct();
  const { orders, loading: ordersLoading, addToCart } = useOrder(true);
  const { credit, loading: creditLoading } = useCredit();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('mokshithLocation') || 'Bangalore, Karnataka';
  });

  // Derived Data
  const categoryOptions = useMemo(() => {
    if (!allProducts) return ['All'];
    return ['All', ...new Set(allProducts.map(p => p.category || p.categoryId?.name || 'General'))];
  }, [allProducts]);

  // Filter categories that have at least one product
  const validCategories = useMemo(() => {
    if (!categories || !allProducts) return [];
    return categories.filter(cat => {
      const hasProducts = allProducts.some(p => 
        p.category === cat.name || 
        (p.categoryId && p.categoryId._id === cat._id)
      );
      return hasProducts;
    });
  }, [categories, allProducts]);

  const arrivingToday = useMemo(() => {
    return orders?.find(o => o.status === 'OUT_FOR_DELIVERY') || orders?.[0];
  }, [orders]);

  const popularProducts = useMemo(() => allProducts?.slice(0, 5) || [], [allProducts]);

  // Geolocation
  useEffect(() => {
    const getLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // For now, just keep stored location, could use reverse geocoding here
            console.log('Got location:', position.coords);
          },
          (error) => {
            console.log('Geolocation error:', error);
          }
        );
      }
    };
    getLocation();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`${routes.PRODUCTS}?search=${searchTerm}`);
    }
  };



  const getProductCountForCategory = (cat) => {
    return allProducts.filter(p => 
      p.category === cat.name || 
      (p.categoryId && p.categoryId._id === cat._id)
    ).length;
  };

  const kpis = [
    { label: "Coins", value: "1,498", icon: <div className="w-8 h-8 bg-[#EFF6FF] rounded-full flex items-center justify-center text-[#0EA5E9] border border-[#0EA5E9]/20 font-black">$</div> },
    { label: "Saved", value: "₹ 2,636", icon: <Wallet className="text-[#0EA5E9]" size={20} /> },
    { label: "Credit Used", value: "₹ 25.4k", icon: <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center text-[#0EA5E9] border border-[#0EA5E9]/20"><Package size={16} /></div> },
  ];

  // Fallback categories if API categories empty
  const categoryEssentialsFallback = [
    { name: "Rice & Pulses", icon: "https://cdn-icons-png.flaticon.com/512/2849/2849884.png" },
    { name: "Edible Oils", icon: "https://cdn-icons-png.flaticon.com/512/3034/3034878.png" },
    { name: "Spices & Masalas", icon: "https://cdn-icons-png.flaticon.com/512/3014/3014093.png" },
    { name: "Atta & Flour", icon: "https://cdn-icons-png.flaticon.com/512/3103/3103287.png" },
    { name: "Beverages", icon: "https://cdn-icons-png.flaticon.com/512/2855/2855667.png" },
    { name: "Dry Fruits", icon: "https://cdn-icons-png.flaticon.com/512/1039/1039328.png" },
    { name: "Cleaning & Hygiene", icon: "https://cdn-icons-png.flaticon.com/512/679/679821.png" },
    { name: "Packaging Material", icon: "https://cdn-icons-png.flaticon.com/512/2855/2855667.png" },
  ];

  const displayCategories = validCategories.length > 0 ? validCategories : categoryEssentialsFallback;

  return (
    <div className="space-y-6 pb-20">
      {/* TOP ROW: HERO + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: HERO CARD */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="relative z-10">
              <p className="text-slate-500 text-sm font-semibold mb-3">Welcome back, {user?.name || "Customer"}! 👋</p>
              <h1 className="text-3xl md:text-4xl font-black text-[#0F172A] leading-tight mb-6 tracking-tight">
                Find everything<br />your business needs
              </h1>
              
              <form onSubmit={handleSearch} className="flex items-center gap-0 bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm focus-within:border-[#0EA5E9] transition-colors">
                <div className="px-4 text-slate-400">
                  <Search size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search products, categories..." 
                  className="flex-1 py-3 text-sm font-medium focus:outline-none border-none placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="h-8 w-px bg-slate-100"></div>
                <div className="relative">
                  <select 
                    className="pl-4 pr-10 py-3 appearance-none text-sm font-semibold text-[#0F172A] bg-transparent cursor-pointer focus:outline-none border-none"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
                <button type="submit" className="bg-[#0EA5E9] text-white px-5 py-3 font-semibold text-sm hover:bg-[#0284C7] transition-colors">
                  Search
                </button>
              </form>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-3 gap-4 relative z-10 pt-2">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="shrink-0">{kpi.icon}</div>
                  <div className="min-w-0">
                    <p className="text-lg md:text-xl font-black text-[#0F172A] leading-none truncate">{kpi.value}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{kpi.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: SIDEBAR CARDS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Arriving Today Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#0EA5E9] rounded-full animate-pulse"></span>
                <h2 className="text-sm font-black text-[#0F172A]">Order Arriving Today</h2>
              </div>
              <Link to={routes.ORDERS} className="text-[10px] font-black text-[#0EA5E9] uppercase tracking-widest hover:underline">View All Orders</Link>
            </div>
            <div className="p-6 flex-1">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0">
                  <Truck className="text-slate-700" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-500 leading-relaxed line-clamp-2">
                    {arrivingToday?.items?.map(i => `${i.name} ${i.quantity} units`).join(', ') || "No active deliveries today."}
                  </p>
                  <p className="text-xl font-black text-[#0F172A] mt-3">₹ {arrivingToday?.totalAmount?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between mt-auto">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Between 10AM - 5PM</p>
              <button className="text-slate-400 hover:text-[#0EA5E9] transition-colors p-1">
                <Phone size={18} />
              </button>
            </div>
          </div>

          {/* Reward Coins Card */}
          <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-[#0EA5E9]/20 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer shrink-0">
            <div className="absolute -right-5 -top-5 w-28 h-28 bg-white/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10">
              <h3 className="text-[#0EA5E9] font-black text-base mb-1.5">Reward Coins</h3>
              <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">Save Rs 1 with every<br />Rs 100 spent</p>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0EA5E9] rounded-full flex items-center justify-center text-white shadow-md">
                <span className="font-black text-base">₹</span>
              </div>
              <div className="text-right">
                <p className="text-[#0EA5E9] font-black text-xl leading-none">2000</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">available coins</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: BANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tata Sampann Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer relative overflow-hidden h-[180px]">
          <div className="max-w-[200px] relative z-10">
            <h2 className="text-[#0F172A] text-2xl font-black leading-tight mb-2">Tata Sampann<br />best Prices</h2>
            <p className="text-slate-500 text-sm font-semibold leading-relaxed">on your favourite products</p>
          </div>
          <div className="flex-1 flex justify-center items-center gap-3 relative z-10">
            <img 
              src="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300" 
              className="h-28 w-20 object-cover rounded-lg shadow-md hover:scale-110 transition-transform" 
              alt="Product 1" 
              onError={(e) => e.target.style.display = 'none'}
            />
            <img 
              src="https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=300" 
              className="h-28 w-20 object-cover rounded-lg shadow-md hover:scale-110 transition-transform" 
              alt="Product 2" 
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>

        {/* Savings Banner */}
        <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-[#0EA5E9]/20 shadow-sm flex items-center justify-between group cursor-pointer relative overflow-hidden h-[180px]">
          <div className="max-w-[220px] relative z-10">
            <h2 className="text-[#0EA5E9] text-xl font-black leading-tight mb-2">Handpicked<br />super savings</h2>
            <p className="text-slate-500 text-sm font-semibold leading-relaxed mb-4">15% off on top picks this week</p>
            <button className="bg-[#0EA5E9] text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-lg hover:bg-[#0284C7] transition-all shadow-sm">
              Shop Now
            </button>
          </div>
          <div className="flex-1 flex justify-end items-center relative z-10 pr-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150" 
                  className="h-16 w-12 object-cover rounded-md" 
                  alt="S1" 
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <div className="bg-white p-1.5 rounded-lg shadow-sm mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=150" 
                  className="h-16 w-12 object-cover rounded-md" 
                  alt="S2" 
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img 
                  src="https://images.unsplash.com/photo-1543083507-073d02bac692?auto=format&fit=crop&q=80&w=150" 
                  className="h-16 w-12 object-cover rounded-md" 
                  alt="S3" 
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
        
        {/* CATEGORY ESSENTIALS */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Category Essentials</h2>
            <Link to={routes.PRODUCTS} className="text-[11px] font-black text-[#0EA5E9] uppercase tracking-widest hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {categoriesLoading ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="min-w-[120px] h-36 rounded-2xl" />)
            ) : displayCategories.map((cat, idx) => (
              <div 
                key={cat._id || idx} 
                className="min-w-[120px] bg-white border border-slate-100 rounded-2xl p-5 flex flex-col items-center gap-4 hover:shadow-lg transition-all cursor-pointer group hover:border-[#0EA5E9]/30"
                onClick={() => navigate(`${routes.PRODUCTS}?category=${cat.name}`)}
              >
                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden transition-all group-hover:scale-105">
                  <img 
                    src={getCategoryImage(cat)} 
                    alt={cat.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200';
                    }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-[#0F172A] leading-snug block">{cat.name}</span>
                  {cat._id && (
                    <span className="text-[10px] font-semibold text-slate-500 mt-1 block">
                      {getProductCountForCategory(cat)} products
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MOST POPULAR */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Most Popular</h2>
            <Link to={routes.PRODUCTS} className="text-[11px] font-black text-[#0EA5E9] uppercase tracking-widest hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {productsLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="min-w-[150px] h-52 rounded-2xl" />)
            ) : popularProducts.map((product) => (
              <div 
                key={product._id} 
                className="min-w-[150px] bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-lg transition-all cursor-pointer group hover:border-[#0EA5E9]/30"
                onClick={() => navigate(`${routes.PRODUCTS}/${product._id}`)}
              >
                <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden relative">
                  <img 
                    src={getProductImage(product)} 
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-all duration-300 bg-white" 
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300';
                    }}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-[#0F172A] line-clamp-2 leading-snug min-h-[32px]">{product.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star size={10} className="fill-[#0EA5E9] text-[#0EA5E9]" />
                    <span className="text-[10px] font-semibold text-slate-500">{product.rating || 4.5}</span>
                  </div>
                  <div className="flex items-end justify-between mt-auto">
                    <p className="text-sm font-black text-[#0F172A]">₹ {product.price?.toLocaleString() || 0}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart({ productId: product._id, quantity: 1 });
                      }}
                      className="w-7 h-7 bg-[#0EA5E9] text-white rounded-lg flex items-center justify-center hover:bg-[#0284C7] transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
};

export default Home;
