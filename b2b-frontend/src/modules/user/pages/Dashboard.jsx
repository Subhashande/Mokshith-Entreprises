import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOrder } from '../../order/hooks/useOrder';
import { useCredit } from '../../credit/hooks/useCredit';
import { routes } from '../../../routes/routeConfig';
import { 
  Package, 
  CreditCard, 
  Clock, 
  TrendingUp, 
  ChevronRight, 
  ArrowUpRight,
  ShoppingBag,
  Truck,
  FileText,
  Settings
} from 'lucide-react';

const B2BDashboard = () => {
  const { user } = useAuth();
  const { orders, loading: ordersLoading } = useOrder(true);
  const { credit, loading: creditLoading } = useCredit();
  const navigate = useNavigate();

  const creditLimit = credit?.creditLimit || 0;
  const balance = credit?.availableCredit || 0;
  const usedCredit = credit?.usedCredit || 0;

  const stats = [
    { 
      label: "Total Orders", 
      value: orders?.length || 0, 
      icon: <Package size={20} />, 
      color: "blue",
      link: routes.ORDERS
    },
    { 
      label: "Credit Limit", 
      value: `₹${creditLimit.toLocaleString()}`, 
      icon: <CreditCard size={20} />, 
      color: "green",
      link: routes.CREDIT
    },
    { 
      label: "Pending Deliveries", 
      value: orders?.filter(o => o.status === 'PENDING')?.length || 0, 
      icon: <Truck size={20} />, 
      color: "orange",
      link: routes.ORDERS
    },
    { 
      label: "Available Balance", 
      value: `₹${balance.toLocaleString()}`, 
      icon: <TrendingUp size={20} />, 
      color: "purple",
      link: routes.CREDIT
    }
  ];

  const recentOrders = orders?.slice(0, 5) || [];

  const quickLinks = [
    { icon: <FileText size={20} />, label: "Invoices", path: routes.ORDERS },
    { icon: <Clock size={20} />, label: "Statements", path: routes.CREDIT },
    { icon: <Settings size={20} />, label: "Settings", path: "/settings" }
  ];

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Business Dashboard</h1>
            <p>Welcome back, {user?.name}</p>
          </div>
          <div className="header-right">
            <button 
              className="premium-button premium-button-primary"
              onClick={() => navigate(routes.PRODUCTS)}
            >
              <ShoppingBag size={18} /> <span>New Order</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card premium-card" onClick={() => navigate(stat.link)}>
              <div className={`stat-icon-wrapper color-${stat.color}`}>
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
              <ChevronRight className="stat-arrow" size={16} />
            </div>
          ))}
        </section>

        <div className="dashboard-content-grid">
          {/* Recent Orders */}
          <section className="recent-orders-section premium-card">
            <div className="section-header">
              <h2 className="section-title">Recent Orders</h2>
              <Link to={routes.ORDERS} className="view-all">View All <ArrowUpRight size={16} /></Link>
            </div>
            
            <div className="orders-table-wrapper">
              {(ordersLoading) ? (
                <div className="empty-state"><p>Loading orders...</p></div>
              ) : recentOrders.length > 0 ? (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id} onClick={() => navigate(`${routes.ORDERS}/${order._id}`)}>
                        <td className="order-id">#{order._id.substring(0, 8)}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="order-amount">₹{order.totalAmount?.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <Package size={40} />
                  <p>No orders yet. Start shopping!</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Links & Credit Info */}
          <div className="side-content">
            <section className="credit-preview premium-card">
              <h2 className="section-title">Credit Utilization</h2>
              {creditLoading ? (
                <p>Loading credit info...</p>
              ) : (
                <div className="credit-progress-wrapper">
                  <div className="credit-labels">
                    <span>Used: ₹{usedCredit.toLocaleString()}</span>
                    <span>Total: ₹{creditLimit.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="credit-help">Maintain a healthy utilization for better credit limits.</p>
                </div>
              )}
              <button className="premium-button premium-button-secondary full-width" onClick={() => navigate(routes.CREDIT)}>
                Manage Credit
              </button>
            </section>

            <section className="quick-links-section">
              <h2 className="section-title">Quick Links</h2>
              <div className="quick-links-grid">
                {quickLinks.map((link, index) => (
                  <Link key={index} to={link.path} className="quick-link-card">
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <style>{`
        .dashboard-container {
          background-color: var(--background);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .dashboard-main {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 3rem 2rem;
          flex: 1;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 3rem;
        }

        .header-left h1 {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .header-left p {
          color: var(--text-muted);
          font-size: 1.125rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          position: relative;
        }

        .stat-icon-wrapper {
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .color-blue { background: #eff6ff; color: #2563eb; }
        .color-green { background: #f0fdf4; color: #16a34a; }
        .color-orange { background: #fff7ed; color: #ea580c; }
        .color-purple { background: #faf5ff; color: #9333ea; }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .stat-arrow {
          margin-left: auto;
          color: var(--border);
          transition: transform 0.2s ease;
        }

        .stat-card:hover .stat-arrow {
          transform: translateX(4px);
          color: var(--primary);
        }

        .dashboard-content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .recent-orders-section {
          padding: 2rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
        }

        .orders-table-wrapper {
          overflow-x: auto;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-table th {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .orders-table td {
          padding: 1.25rem 0;
          font-size: 0.9375rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .orders-table tr {
          cursor: pointer;
          transition: background 0.2s;
        }

        .orders-table tr:hover {
          background-color: #f8fafc;
        }

        .order-id {
          font-weight: 700;
          color: var(--primary);
        }

        .order-amount {
          font-weight: 600;
          color: var(--text-main);
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status-pending { background: #fffbeb; color: #92400e; }
        .status-completed { background: #f0fdf4; color: #16a34a; }
        .status-shipped { background: #eff6ff; color: #2563eb; }

        .side-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .credit-preview {
          padding: 2rem;
        }

        .credit-progress-wrapper {
          margin: 1.5rem 0 2rem;
        }

        .credit-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .progress-bar {
          height: 0.5rem;
          background-color: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 9999px;
        }

        .credit-help {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 1rem;
        }

        .full-width {
          width: 100%;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .quick-link-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem;
          background: white;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--text-main);
          transition: all 0.2s;
        }

        .quick-link-card:hover {
          border-color: var(--primary);
          color: var(--primary);
          transform: translateY(-2px);
        }

        .quick-link-card span {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .empty-state {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
        }

        @media (max-width: 992px) {
          .dashboard-content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default B2BDashboard;