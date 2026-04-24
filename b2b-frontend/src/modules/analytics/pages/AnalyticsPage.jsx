import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import Card from '../../../components/ui/Card';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  DollarSign, 
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="h-32 bg-gray-200 rounded-xl"></div>
  </div>
);

const KPICard = ({ title, value, change, changeType, icon: Icon, color }) => {
  const isPositive = changeType === 'positive';
  
  return (
    <Card className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1">{change}%</span>
              <span className="text-gray-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </Card>
  );
};

const AnalyticsPage = () => {
  const { dashboard, salesData, orderTrends, categoryData, topProducts: rawTopProducts, loading, error } = useAnalytics();
  const topProducts = Array.isArray(rawTopProducts) ? rawTopProducts : [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load analytics</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const stats = dashboard || {};
  const kpis = [
    {
      title: 'Total Orders',
      value: stats.totalOrders?.toLocaleString() || '0',
      change: stats.ordersGrowth || 12,
      changeType: 'positive',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Revenue',
      value: `₹${(stats.revenue || 0).toLocaleString()}`,
      change: stats.revenueGrowth || 8,
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Deliveries',
      value: stats.pendingDeliveries?.toString() || '0',
      change: stats.deliveryGrowth || -3,
      changeType: 'negative',
      icon: Clock,
      color: 'bg-yellow-500'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers?.toLocaleString() || '0',
      change: stats.userGrowth || 5,
      changeType: 'positive',
      icon: Users,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time insights into your business performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sales Trend</h3>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            {salesData.length > 0 ? (
              <div className="w-full px-4">
                <div className="flex items-end justify-between h-48 gap-2">
                  {salesData.slice(-7).map((item, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                        style={{ height: `${(item.revenue / (Math.max(...salesData.map(s => s.revenue)) || 1)) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <Activity size={32} className="mx-auto mb-2" />
                <p>No sales data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Order Trends</h3>
            <PieChart size={20} className="text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            {orderTrends.length > 0 ? (
              <div className="w-full px-4">
                <div className="space-y-4">
                  {orderTrends.map((item, i) => {
                    const maxOrders = Math.max(...orderTrends.map(o => o.orders)) || 1;
                    const percentage = Math.round((item.orders / maxOrders) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12">{item.orders}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <TrendingUp size={32} className="mx-auto mb-2" />
                <p>No trend data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Category Distribution</h3>
            <PieChart size={20} className="text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            {categoryData.length > 0 ? (
              <div className="flex flex-wrap gap-4 justify-center">
                {categoryData.map((cat, i) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || colors[i % colors.length] }}></div>
                      <span className="text-sm text-gray-600">{cat.name}</span>
                      <span className="text-sm font-medium text-gray-900">{cat.value}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <PieChart size={32} className="mx-auto mb-2" />
                <p>No category data available</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Products</h3>
            <Package size={20} className="text-gray-400" />
          </div>
          <div className="h-64 overflow-auto">
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{product.sales} sales</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Package size={32} className="mx-auto mb-2" />
                  <p>No product data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        .kpi-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;