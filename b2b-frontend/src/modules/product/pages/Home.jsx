import React, { useState, useMemo } from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useOrder } from '../../order/hooks/useOrder.js';
import { useProduct } from '../hooks/useProduct.js';
import { useCredit } from '../../credit/hooks/useCredit.js';
import { routes } from '../../../routes/routeConfig.js';
import Skeleton from '../../../components/feedback/Skeleton.jsx';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProduct();
  const { orders, loading: ordersLoading, addToCart } = useOrder(true);
  const { credit, loading: creditLoading } = useCredit();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Derived Data
  const categories = useMemo(() => {
    if (!products) return ["All"];
    return ["All", ...new Set(products.map(p => p.category || p.categoryId?.name || "General"))];
  }, [products]);

  const arrivingToday = useMemo(() => {
    return orders?.find(o => o.status === 'OUT_FOR_DELIVERY') || orders?.[0];
  }, [orders]);

  const popularProducts = useMemo(() => products?.slice(0, 5) || [], [products]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`${routes.PRODUCTS}?search=${searchTerm}`);
    }
  };

  const kpis = [
    { label: "Coins", value: "1,498", icon: <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100 font-black">$</div> },
    { label: "Saved", value: "₹ 2,636", icon: <Wallet className="text-blue-400" size={20} /> },
    { label: "Credit Used", value: "₹ 25.4k", icon: <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100"><Package size={16} /></div> },
  ];

  const categoryEssentials = [
    { name: "Hardware", icon: "https://cdn-icons-png.flaticon.com/512/3014/3014093.png" },
    { name: "Electrical", icon: "https://cdn-icons-png.flaticon.com/512/3103/3103287.png" },
    { name: "Machinery", icon: "https://cdn-icons-png.flaticon.com/512/2855/2855667.png" },
    { name: "Safety", icon: "https://cdn-icons-png.flaticon.com/512/1039/1039328.png" },
    { name: "Packaging", icon: "https://cdn-icons-png.flaticon.com/512/679/679821.png" },
    { name: "Rice & Pulses", icon: "https://cdn-icons-png.flaticon.com/512/2849/2849884.png" },
    { name: "Oil", icon: "https://cdn-icons-png.flaticon.com/512/3034/3034878.png" },
  ];

  return (
    <div className="space-y-10 pb-20">
      
      {/* TOP ROW: HERO + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT: HERO CARD */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-[24px] p-8 md:p-10 border border-slate-100 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-bold mb-3">Welcome back, {user?.name || "Customer"}! 👋</p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-10 tracking-tight">
                Find everything<br />your business needs
              </h1>
              
              <form onSubmit={handleSearch} className="flex items-center gap-0 bg-white border border-slate-200 rounded-xl overflow-hidden mb-12 shadow-sm focus-within:border-blue-400 transition-colors">
                <div className="px-5 text-slate-400">
                  <Search size={22} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search products, categories..." 
                  className="flex-1 py-4 text-base font-medium focus:outline-none border-none placeholder:text-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="h-10 w-px bg-slate-100"></div>
                <div className="relative">
                  <select 
                    className="pl-5 pr-12 py-4 appearance-none text-sm font-black text-slate-700 bg-transparent cursor-pointer focus:outline-none border-none"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </form>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-3 gap-8 relative z-10 pt-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="shrink-0">{kpi.icon}</div>
                  <div className="min-w-0">
                    <p className="text-lg md:text-xl font-black text-slate-900 leading-none truncate">{kpi.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{kpi.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: SIDEBAR CARDS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Arriving Today Card */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <h2 className="text-sm font-black text-slate-900">Order Arriving Today</h2>
              </div>
              <Link to={routes.ORDERS} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All Orders</Link>
            </div>
            <div className="p-7 flex-1">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                  <Truck className="text-slate-800" size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-400 leading-relaxed line-clamp-2">
                    {arrivingToday?.items?.map(i => `${i.name} ${i.quantity} units`).join(', ') || "No active deliveries today."}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-3">₹ {arrivingToday?.totalAmount?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </div>
            <div className="px-7 py-5 bg-slate-50 flex items-center justify-between mt-auto">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Between 10AM - 5PM</p>
              <button className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                <Phone size={20} />
              </button>
            </div>
          </div>

          {/* Reward Coins Card */}
          <div className="bg-[#EFF6FF] rounded-[24px] p-7 border border-blue-100 shadow-sm flex items-center justify-between relative overflow-hidden group cursor-pointer shrink-0">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10">
              <h3 className="text-blue-600 font-black text-base mb-1.5">Reward Coins</h3>
              <p className="text-slate-500 text-[11px] font-bold leading-relaxed">Save Rs 1 with every<br />Rs 100 spent</p>
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-white border-4 border-white shadow-md">
                <span className="font-black text-lg">₹</span>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-black text-2xl leading-none">2000</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">available coins</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: BANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tata Sampann Banner */}
        <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer relative overflow-hidden h-[200px]">
          <div className="max-w-[220px] relative z-10">
            <h2 className="text-emerald-600 text-3xl font-black leading-tight mb-3">Tata Sampann<br />best Prices</h2>
            <p className="text-slate-400 text-sm font-bold leading-relaxed">on your favourite products</p>
          </div>
          <div className="flex-1 flex justify-center items-center gap-4 relative z-10">
            <img src="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300" className="h-32 w-24 object-cover rounded-xl shadow-lg hover:scale-110 transition-transform" alt="Product 1" />
            <img src="https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=300" className="h-32 w-24 object-cover rounded-xl shadow-lg hover:scale-110 transition-transform" alt="Product 2" />
          </div>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600">
            <ChevronLeft size={20} />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Savings Banner */}
        <div className="bg-[#F0FDF4] rounded-[24px] p-8 border border-emerald-100 shadow-sm flex items-center justify-between group cursor-pointer relative overflow-hidden h-[200px]">
          <div className="max-w-[240px] relative z-10">
            <h2 className="text-emerald-700 text-2xl font-black leading-tight mb-3">Handpicked<br />super savings</h2>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">15% off on top picks this week</p>
            <button className="bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
              Shop Now
            </button>
          </div>
          <div className="flex-1 flex justify-end items-center relative z-10 pr-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm rotate-[-6deg] hover:rotate-0 transition-transform">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150" className="h-20 w-16 object-cover rounded-lg" alt="S1" />
              </div>
              <div className="bg-white p-2 rounded-xl shadow-sm mt-6 rotate-[4deg] hover:rotate-0 transition-transform">
                <img src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=150" className="h-20 w-16 object-cover rounded-lg" alt="S2" />
              </div>
              <div className="bg-white p-2 rounded-xl shadow-sm rotate-[-3deg] hover:rotate-0 transition-transform">
                <img src="https://images.unsplash.com/photo-1543083507-073d02bac692?auto=format&fit=crop&q=80&w=150" className="h-20 w-16 object-cover rounded-lg" alt="S3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
        
        {/* CATEGORY ESSENTIALS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Category Essentials</h2>
            <Link to={routes.PRODUCTS} className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
            {categoryEssentials.map((cat, idx) => (
              <div key={idx} className="min-w-[130px] bg-white border border-slate-100 rounded-[24px] p-7 flex flex-col items-center gap-5 hover:shadow-xl transition-all cursor-pointer group hover:border-blue-100">
                <div className="w-16 h-16 flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3">
                  <img src={cat.icon} className="w-14 h-14 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt={cat.name} />
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-tighter text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* MOST POPULAR */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Most Popular</h2>
            <Link to={routes.PRODUCTS} className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide">
            {productsLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="min-w-[160px] h-56 rounded-[24px]" />)
            ) : popularProducts.map((product) => (
              <div 
                key={product._id} 
                className="min-w-[170px] bg-white border border-slate-100 rounded-[24px] p-5 flex flex-col gap-4 hover:shadow-xl transition-all cursor-pointer group hover:border-blue-100"
                onClick={() => navigate(`${routes.PRODUCTS}/${product._id}`)}
              >
                <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative">
                  <img src={product.images?.[0] || 'https://placehold.co/200'} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt={product.name} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug h-8">{product.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <Star size={12} className="fill-orange-400 text-orange-400" />
                    <span className="text-[11px] font-black text-slate-500">{product.rating || 4.5}</span>
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
