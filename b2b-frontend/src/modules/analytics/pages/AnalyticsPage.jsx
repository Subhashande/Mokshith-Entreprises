import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  DollarSign, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity, 
  ArrowUpRight, 
  RefreshCcw, 
  Calendar, 
  Layers, 
  ArrowRight 
} from 'lucide-react';

const SkeletonCard = () => (
  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-3">
        <div className="h-4 w-24 bg-gray-100 rounded-lg"></div>
        <div className="h-8 w-32 bg-gray-100 rounded-xl"></div>
      </div>
      <div className="w-12 h-12 bg-gray-100 rounded-2xl"></div>
    </div>
    <div className="h-4 w-40 bg-gray-100 rounded-lg"></div>
  </div>
);

const KPICard = ({ title, value, change, changeType, icon: Icon, color }) => {
  const isPositive = changeType === 'positive';
  
  return (
    <Card className="hover:shadow-2xl transition-all duration-500 border-none bg-white group overflow-hidden p-8 rounded-[2rem] border border-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">{title}</p>
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">{value}</h3>
          {change !== undefined && (
            <div className={`flex items-center text-xs font-black ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-3 py-1.5 rounded-xl w-fit shadow-sm`}>
              {isPositive ? <TrendingUp size={14} className="mr-1.5" /> : <TrendingDown size={14} className="mr-1.5" />}
              <span>{Math.abs(change)}%</span>
              <span className="text-gray-400 ml-2 font-bold">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-5 rounded-[1.5rem] ${color} shadow-2xl shadow-${color.split('-')[1]}-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
          <Icon size={28} className="text-white" />
        </div>
      </div>
    </Card>
  );
};

const AnalyticsPage = () => {
  const { 
    dashboard, 
    salesData: rawSalesData, 
    orderTrends: rawOrderTrends, 
    categoryData: rawCategoryData, 
    topProducts: rawTopProducts, 
    loading, 
    error 
  } = useAnalytics();

  const salesData = Array.isArray(rawSalesData) ? rawSalesData : [];
  const orderTrends = Array.isArray(rawOrderTrends) ? rawOrderTrends : [];
  const topProducts = Array.isArray(rawTopProducts) ? rawTopProducts : [];

  if (loading) {
    return (
      <div className="p-10 bg-gray-50/50 min-h-screen space-y-10">
        <div className="animate-pulse">
          <div className="h-12 w-72 bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-6 w-[30rem] bg-gray-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="h-[30rem] bg-white rounded-[3rem] shadow-sm animate-pulse"></div>
          <div className="h-[30rem] bg-white rounded-[3rem] shadow-sm animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 bg-gray-50/50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center py-20 px-10 rounded-[3rem] border-none shadow-2xl bg-white">
          <div className="w-28 h-28 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-10 text-rose-500 shadow-inner">
            <Activity size={56} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Analytics Unavailable</h3>
          <p className="text-gray-500 font-bold mb-12 leading-relaxed text-lg">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:-translate-y-1"
          >
            <RefreshCcw size={24} className="mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  const stats = dashboard || {};
  const kpis = [
    {
      title: 'Total Orders',
      value: (stats.totalOrders || 0).toLocaleString(),
      change: stats.ordersGrowth || 12,
      changeType: (stats.ordersGrowth || 12) >= 0 ? 'positive' : 'negative',
      icon: Package,
      color: 'bg-blue-600'
    },
    {
      title: 'Gross Revenue',
      value: `₹${(stats.revenue || 0).toLocaleString()}`,
      change: stats.revenueGrowth || 8,
      changeType: (stats.revenueGrowth || 8) >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'bg-emerald-600'
    },
    {
      title: 'Pending Fulfillment',
      value: (stats.pendingDeliveries || 0).toString(),
      change: stats.deliveryGrowth || -3,
      changeType: (stats.deliveryGrowth || -3) >= 0 ? 'positive' : 'negative',
      icon: Clock,
      color: 'bg-amber-500'
    },
    {
      title: 'Active Accounts',
      value: (stats.activeUsers || 0).toLocaleString(),
      change: stats.userGrowth || 5,
      changeType: (stats.userGrowth || 5) >= 0 ? 'positive' : 'negative',
      icon: Users,
      color: 'bg-indigo-600'
    }
  ];

  return (
    <div className="p-10 bg-gray-50/50 min-h-screen">
      <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
            Business <span className="text-blue-600">Intelligence</span>
          </h1>
          <p className="text-gray-500 font-bold mt-3 flex items-center gap-3 text-lg">
            <Calendar size={22} className="text-blue-400" />
            Insights for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" className="h-14 px-8 rounded-2xl flex items-center gap-3 shadow-sm font-black border-2 border-gray-100 hover:bg-gray-50 transition-all">
            <Layers size={20} />
            Export Data
          </Button>
          <Button className="h-14 px-8 rounded-2xl flex items-center gap-3 shadow-2xl shadow-blue-100 bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:-translate-y-1 font-black">
            Customize View
            <ArrowUpRight size={20} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="p-10 rounded-[3rem] border-none shadow-sm bg-white border border-gray-50">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Revenue Trends</h3>
              <p className="text-base font-bold text-gray-400 mt-1">Monthly performance overview</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-[1.5rem] text-blue-600 shadow-inner">
              <BarChart3 size={28} />
            </div>
          </div>
          
          <div className="h-80 flex items-end justify-between bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100/50 gap-6">
            {salesData.length > 0 ? (
              salesData.slice(-7).map((item, i) => {
                const maxRevenue = Math.max(...salesData.map(s => s.revenue)) || 1;
                const height = (item.revenue / maxRevenue) * 100;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group relative">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-2xl transition-all duration-700 group-hover:scale-x-110 shadow-xl shadow-blue-100"
                      style={{ height: `${Math.max(height, 8)}%` }}
                    >
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-black px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 whitespace-nowrap z-20 shadow-2xl">
                        ₹{item.revenue?.toLocaleString()}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 mt-5 uppercase tracking-[0.1em] group-hover:text-blue-600 transition-colors">
                      {typeof item.name === 'object' ? (item.name?.label || item.name?.name || 'N/A') : (item.name || 'N/A')}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                <Activity size={64} strokeWidth={1} className="mb-6 animate-pulse" />
                <p className="font-black text-lg">Aggregating sales data...</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-10 rounded-[3rem] border-none shadow-sm bg-white border border-gray-50">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Category Performance</h3>
              <p className="text-base font-bold text-gray-400 mt-1">Order volume by segment</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-[1.5rem] text-emerald-600 shadow-inner">
              <PieChart size={28} />
            </div>
          </div>

          <div className="space-y-8">
            {orderTrends.length > 0 ? (
              orderTrends.slice(0, 5).map((item, i) => {
                const maxOrders = Math.max(...orderTrends.map(o => o.orders)) || 1;
                const percentage = Math.round((item.orders / maxOrders) * 100);
                const colors = [
                  'from-blue-600 to-blue-400', 
                  'from-emerald-600 to-emerald-400', 
                  'from-indigo-600 to-indigo-400', 
                  'from-amber-600 to-amber-400', 
                  'from-rose-600 to-rose-400'
                ];
                
                return (
                  <div key={i} className="space-y-3 group">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-gray-700 group-hover:text-gray-900 transition-colors">
                        {typeof item.name === 'object' ? (item.name?.label || item.name?.name || 'N/A') : (item.name || 'N/A')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-400">{percentage}%</span>
                        <span className="text-base font-black text-gray-900">{item.orders} orders</span>
                      </div>
                    </div>
                    <div className="h-5 bg-gray-50 rounded-full overflow-hidden p-1 border border-gray-100 shadow-inner">
                      <div 
                        className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-1000 ease-out shadow-lg transform group-hover:scale-y-110`}
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-gray-300">
                <PieChart size={64} strokeWidth={1} className="mb-6 animate-pulse" />
                <p className="font-black text-lg">Calculating distribution...</p>
              </div>
            )}
          </div>

          {orderTrends.length > 5 && (
            <button className="w-full mt-10 py-5 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-400 font-black hover:bg-gray-50 hover:border-blue-100 hover:text-blue-600 transition-all flex items-center justify-center gap-3 group active:scale-95">
              View All Categories
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </button>
          )}
        </Card>
      </div>

      <div className="mt-10">
        <Card className="p-10 rounded-[3rem] border-none shadow-sm bg-white border border-gray-50 overflow-hidden">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Top Performing Products</h3>
              <p className="text-base font-bold text-gray-400 mt-1">Products driving the most revenue</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-[1.5rem] text-purple-600 shadow-inner">
              <Package size={28} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Product Details</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Category</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Sales</th>
                  <th className="pb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rawTopProducts.length > 0 ? (
                  rawTopProducts.slice(0, 5).map((product, i) => (
                    <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50">
                            <img 
                              src={product.image || "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=100&q=80"} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{product.name}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">SKU: {product.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="py-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl">
                          <TrendingUp size={14} className="text-emerald-500" />
                          <span className="text-sm font-black text-gray-700">{product.salesCount || 0}</span>
                        </div>
                      </td>
                      <td className="py-6 text-right">
                        <p className="text-lg font-black text-gray-900 tracking-tight">₹{(product.revenue || 0).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-300">
                        <Activity size={48} className="mb-4 animate-pulse" />
                        <p className="font-black">No product performance data found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;