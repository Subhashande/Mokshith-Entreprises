import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOrder } from '../../order/hooks/useOrder';
import { useCredit } from '../../credit/hooks/useCredit';
import { routes } from '../../../routes/routeConfig';
import styles from './Dashboard.module.css';
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
    <div className={styles.dashboardContainer}>
      <main className={styles.dashboardMain}>
        <header className={styles.dashboardHeader}>
          <div className={styles.headerLeft}>
            <h1>Business Dashboard</h1>
            <p>Welcome back, {user?.name}</p>
          </div>
          <div className={styles.headerRight}>
            <button 
              className="btn-primary"
              onClick={() => navigate(routes.PRODUCTS)}
            >
              <ShoppingBag size={18} /> <span>New Order</span>
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className={styles.statsGrid} role="region" aria-label="Dashboard statistics">
          {stats.map((stat, index) => (
            <button 
              key={index} 
              className={`${styles.statCard} premium-card`} 
              onClick={() => navigate(stat.link)}
              aria-label={`${stat.label}: ${stat.value}. Click to view details`}
            >
              <div className={`${styles.statIconWrapper} ${styles[`color${stat.color.charAt(0).toUpperCase()}${stat.color.slice(1)}`]}`} aria-hidden="true">
                {stat.icon}
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>{stat.label}</span>
                <span className={styles.statValue}>{stat.value}</span>
              </div>
              <ChevronRight className={styles.statArrow} size={16} aria-hidden="true" />
            </button>
          ))}
        </section>

        <div className={styles.dashboardContentGrid}>
          {/* Recent Orders */}
          <section className={`${styles.recentOrdersSection} premium-card`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Orders</h2>
              <Link to={routes.ORDERS} className={styles.viewAll}>View All <ArrowUpRight size={16} /></Link>
            </div>
            
            <div className={styles.ordersTableWrapper}>
              {(ordersLoading) ? (
                <div className={styles.emptyState}><p>Loading orders...</p></div>
              ) : recentOrders.length > 0 ? (
                <table className={styles.ordersTable}>
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
                        <td className={styles.orderId}>#{order._id.substring(0, 8)}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className={styles.orderAmount}>₹{order.totalAmount?.toLocaleString()}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${order.status?.charAt(0).toUpperCase()}${order.status?.slice(1).toLowerCase()}`]}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.emptyState}>
                  <Package size={40} />
                  <p>No orders yet. Start shopping!</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Links & Credit Info */}
          <div className={styles.sideContent}>
            <section className={`${styles.creditPreview} premium-card`}>
              <h2 className={styles.sectionTitle}>Credit Utilization</h2>
              {creditLoading ? (
                <p>Loading credit info...</p>
              ) : (
                <div className={styles.creditProgressWrapper}>
                  <div className={styles.creditLabels}>
                    <span>Used: ₹{usedCredit.toLocaleString()}</span>
                    <span>Total: ₹{creditLimit.toLocaleString()}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className={styles.creditHelp}>Maintain a healthy utilization for better credit limits.</p>
                </div>
              )}
              <button className="btn-secondary" style={{width: '100%'}} onClick={() => navigate(routes.CREDIT)}>
                Manage Credit
              </button>
            </section>

            <section className={styles.quickLinksSection}>
              <h2 className={styles.sectionTitle}>Quick Links</h2>
              <div className={styles.quickLinksGrid}>
                {quickLinks.map((link, index) => (
                  <Link key={index} to={link.path} className={styles.quickLinkCard}>
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default B2BDashboard;
