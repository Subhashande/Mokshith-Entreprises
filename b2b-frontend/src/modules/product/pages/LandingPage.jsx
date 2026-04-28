import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  ChevronRight, 
  Users, 
  Globe, 
  ShieldCheck, 
  ArrowRight,
  Receipt,
  Activity,
  LayoutGrid,
  Package,
  Droplets,
  Wheat,
  Utensils,
  Cookie,
  Coffee
} from 'lucide-react';
import { routes } from '../../../routes/routeConfig';
import { useAuth } from '../../auth/hooks/useAuth';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const categories = [
    { name: "Rice & Grains", icon: <Wheat className="w-5 h-5" />, slug: "rice-grains" },
    { name: "Pulses & Dals", icon: <Package className="w-5 h-5" />, slug: "pulses-dals" },
    { name: "Edible Oils", icon: <Droplets className="w-5 h-5" />, slug: "edible-oils" },
    { name: "FMCG", icon: <LayoutGrid className="w-5 h-5" />, slug: "fmcg" },
    { name: "Sugar & Salt", icon: <Cookie className="w-5 h-5" />, slug: "sugar-salt" },
    { name: "Beverages", icon: <Coffee className="w-5 h-5" />, slug: "beverages" }
  ];

  const features = [
    {
      icon: <ShoppingBag className="w-6 h-6 text-blue-600" />,
      title: "Bulk Ordering",
      description: "Optimized for large volume purchases with multi-tier pricing."
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      title: "Credit System",
      description: "Manage business credit lines and flexible payment options."
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      title: "Fast Delivery",
      description: "Reliable logistics network with next-day delivery options."
    },
    {
      icon: <Receipt className="w-6 h-6 text-blue-600" />,
      title: "GST Invoicing",
      description: "Automated GST-compliant invoices for all your business orders."
    },
    {
      icon: <Activity className="w-6 h-6 text-blue-600" />,
      title: "Real-time Tracking",
      description: "Track your shipments in real-time from warehouse to doorstep."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: "Secure Payments",
      description: "Multiple secure payment gateways with fraud protection."
    }
  ];

  const products = [
    { name: "Sona Masoori Rice", price: "₹1,150", unit: "25kg Bag", img: "🍚", minQty: 10, category: "Rice & Grains" },
    { name: "Toor Dal Premium", price: "₹145", unit: "1kg Pouch", img: "🫘", minQty: 50, category: "Pulses & Dals" },
    { name: "Sunflower Oil", price: "₹1,770", unit: "15L Tin", img: "🧴", minQty: 5, category: "Edible Oils" },
    { name: "Refined Sugar", price: "₹2,100", unit: "50kg Bag", img: "🧂", minQty: 5, category: "Sugar & Salt" }
  ];

  const stats = [
    { label: "Used by businesses", value: "1,000+" },
    { label: "Orders processed", value: "50,000+" },
    { label: "Active vendors", value: "500+" }
  ];

  const handleDashboard = () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      navigate(routes.LOGIN);
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      const role = parsedUser.role;

      if (role === 'B2B_CUSTOMER' || role === 'B2C_CUSTOMER') {
        navigate(routes.DASHBOARD);
      } else if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'SUPER_ADMIN') {
        navigate('/super-admin/dashboard');
      } else if (role === 'DELIVERY_PARTNER') {
        navigate('/delivery/dashboard');
      } else {
        navigate(routes.PRODUCTS);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      navigate(routes.LOGIN);
    }
  };

  return (
    <div className={styles.landingContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        {/* ... existing hero code ... */}
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Smart B2B Commerce Platform for Growing Businesses
            </h1>
            <p className={styles.heroSubtitle}>
              Manage bulk purchases, credit, and logistics in one seamless system. Built for modern enterprises.
            </p>
            <div className={styles.heroActions}>
              <button 
                onClick={handleDashboard}
                className="btn-primary"
              >
                {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => navigate(routes.PRODUCTS)}
                className="btn-secondary"
              >
                Browse Products
              </button>
            </div>
          </div>

          <div className={styles.heroMockups}>
            <div className={styles.mockupContainer}>
              {/* Product Listing Screen */}
              <div className={`${styles.mockupScreen} ${styles.mockup1}`}>
                <div className={styles.mockupInner}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.statusBar}></div>
                    <div className={styles.appNav}>Rice & Grains</div>
                  </div>
                  <div className={styles.mockupContent}>
                    <div className={styles.mockupItem}>
                      <div className={styles.itemImg}></div>
                      <div className={styles.itemDetails}>
                        <div className={styles.itemName}>Sona Masoori Rice</div>
                        <div className={styles.itemPrice}>₹1,150 /bag</div>
                        <div className={styles.itemBulk}>Min. Order: 10 Bags</div>
                      </div>
                    </div>
                    <div className={styles.mockupItem}>
                      <div className={styles.itemImg}></div>
                      <div className={styles.itemDetails}>
                        <div className={styles.itemName}>Basmati Rice 25kg</div>
                        <div className={styles.itemPrice}>₹1,800 /bag</div>
                        <div className={styles.itemBulk}>Min. Order: 5 Bags</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Tracking Screen */}
              <div className={`${styles.mockupScreen} ${styles.mockup2}`}>
                <div className={styles.mockupInner}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.statusBar}></div>
                    <div className={styles.appNav}>Order Tracking</div>
                  </div>
                  <div className="mockup-content p-4">
                    <div className={styles.trackingId}>ME1234567890</div>
                    <div className={styles.trackingTimeline}>
                      <div className={`${styles.timelineStep} ${styles.active}`}>Order Confirmed</div>
                      <div className={`${styles.timelineStep} ${styles.active}`}>Packed</div>
                      <div className={`${styles.timelineStep} ${styles.active}`}>Shipped</div>
                      <div className={styles.timelineStep}>Out for Delivery</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout/Cart Screen */}
              <div className={`${styles.mockupScreen} ${styles.mockup3}`}>
                <div className={styles.mockupInner}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.statusBar}></div>
                    <div className={styles.appNav}>Checkout</div>
                  </div>
                  <div className="mockup-content p-4">
                    <div className={styles.orderSummary}>
                      <div className={styles.summaryRow}><span>Subtotal</span><span>₹86,700</span></div>
                      <div className={styles.summaryRow}><span>GST (5%)</span><span>₹4,335</span></div>
                      <div className={styles.summaryTotal}><span>Total Amount</span><span>₹91,035</span></div>
                    </div>
                    <div className={styles.payButton}>Pay Now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className={styles.categoryStrip}>
        <div className={styles.categoryContainer}>
          {categories.map((cat, i) => (
            <div key={i} className={styles.categoryItem}>
              <div className={styles.categoryIcon}>{cat.icon}</div>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2>Why Choose Mokshith?</h2>
          <p>Everything you need to scale your business operations</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={`${styles.featureCard} premium-card`}>
              <div className={styles.featureIconWrapper}>
                {feature.icon}
              </div>
              <div className={styles.featureText}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Preview Section */}
      <section className={styles.productPreviewSection}>
        <div className={styles.sectionHeader}>
          <h2>Top Wholesale Deals</h2>
          <p>Direct from vendors with bulk pricing</p>
        </div>
        <div className={styles.productsGrid}>
          {products.map((prod, i) => (
            <div key={i} className={styles.productMiniCard}>
              <div className={styles.prodImg}>{prod.img}</div>
              <div className={styles.prodInfo}>
                <h4>{prod.name}</h4>
                <div className={styles.prodMeta}>
                  <span className={styles.prodPrice}>{prod.price}</span>
                  <span className={styles.prodUnit}>/{prod.unit}</span>
                </div>
                <button className={styles.addBtn}>Add</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <div className={styles.ctaContent}>
            <h2>Ready to transform your business?</h2>
            <p>Join thousands of businesses already scaling with our platform.</p>
            <button 
              onClick={handleDashboard}
              className="btn-primary"
            >
              {user ? 'Go to Dashboard' : 'Create Your Account'} <ChevronRight size={18} />
            </button>
          </div>
          <div className={styles.ctaVisual}>
            <div className={styles.creditWidget}>
              <div className={styles.widgetHeader}>
                <CreditCard size={20} />
                <span>Credit Line</span>
              </div>
              <div className={styles.widgetAmount}>₹25,000</div>
              <div className={styles.widgetLabel}>Available Limit</div>
              <div className={styles.widgetBar}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsContainer}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
